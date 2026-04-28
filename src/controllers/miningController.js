// src/controllers/miningController.js
const User = require("../models/User");
const Transaction = require("../models/Transaction");
const referralService = require("../services/referralService");
const miningQueue = require("../queues/miningQueue");
const logger = require("../utils/logger");

exports.startMining = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (user.isFlagged) {
      return res.status(403).json({ error: "Your account has been flagged for suspicious activity. Access restricted." });
    }

    if (user.isMiningActive) {
      const diff = (Date.now() - new Date(user.lastMiningStartTime)) / 3600000;
      if (diff < 24) {
        return res.status(400).json({ error: "Mining session is already active" });
      }
      // If more than 24h passed but not claimed, we might want to force claim or just allow restart.
      // But according to the new logic, they should claim first.
      return res.status(400).json({ error: "Please claim your rewards before starting a new session" });
    }

    user.lastMiningStartTime = new Date();
    user.isMiningActive = true;

    await user.save();

    // Schedule auto-claim after 24 hours
    await miningQueue.add('autoClaim', 
      { userId: user._id }, 
      { delay: 24 * 3600 * 1000, jobId: `mining-${user._id}-${user.lastMiningStartTime.getTime()}` }
    );

    res.json({ message: "Mining started. Rewards will be auto-claimed in 24 hours.", startTime: user.lastMiningStartTime });
  } catch (error) {
    logger.error("Error in startMining: %o", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.claimReward = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user || user.isFlagged) {
      return res.status(403).json({ error: "Your account has been flagged for suspicious activity. Access restricted." });
    }

    if (!user.isMiningActive || !user.lastMiningStartTime) {
      return res.status(400).json({ error: "No active mining session found or already claimed." });
    }
    const now = Date.now();
    const startTime = new Date(user.lastMiningStartTime).getTime();
    const hoursElapsed = Math.min((now - startTime) / 3600000, 24);
    const earned = parseFloat((hoursElapsed * user.miningRate).toFixed(8));

    if (earned <= 0) {
      return res.status(400).json({ error: "No rewards earned yet." });
    }

    // Atomic update to prevent race conditions and ensure only active sessions are claimed
    const updatedUser = await User.findOneAndUpdate(
      { _id: userId, isMiningActive: true },
      { 
        $inc: { balance: earned, totalEarnedFromMining: earned },
        $set: { isMiningActive: false, lastMiningStartTime: null }
      },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(400).json({ error: "Claim failed. Session might have already been processed." });
    }

    // Log Transaction (async)
    Transaction.create({
      userId: updatedUser._id,
      type: 'mining',
      amount: earned,
      status: 'completed',
      metadata: { hoursMined: hoursElapsed, rate: user.miningRate }
    }).catch(err => logger.error("Mining transaction log failed: %o", err));

    // Distribute referral commission (async)
    referralService.distributeReferralCommission(updatedUser, earned).catch(err => {
      logger.error("Referral commission distribution failed: %o", err);
    });

    res.json({
      earned,
      message: "Reward claimed successfully",
      newBalance: updatedUser.balance
    });
  } catch (error) {
    logger.error("Error in claimReward: %o", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.getStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    res.json({
      isMining: user.isMiningActive,
      startTime: user.lastMiningStartTime,
      rate: user.miningRate,
      balance: user.balance,
      totalEarned: user.totalEarnedFromMining
    });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.getBalance = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    let pendingEarned = 0;
    if (user.isMiningActive && user.lastMiningStartTime) {
      const hoursElapsed = (Date.now() - new Date(user.lastMiningStartTime)) / 3600000;
      pendingEarned = Math.min(hoursElapsed, 24) * user.miningRate;
    }

    res.json({ 
      balance: user.balance,
      pendingBalance: pendingEarned,
      totalBalance: user.balance + pendingEarned
    });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};