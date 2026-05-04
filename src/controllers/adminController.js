// src/controllers/adminController.js
const Withdrawal = require("../models/Withdrawal");
const User = require("../models/User");
const miningQueue = require("../queues/miningQueue");
const mainQueue = require("../queues/queue");

exports.getWithdrawals = async (req, res) => {
  const list = await Withdrawal.find({ status: "pending" }).populate("userId");
  res.send(list);
};

exports.approve = async (req, res) => {
  const { withdrawalId, txHash } = req.body;

  const w = await Withdrawal.findById(withdrawalId);

  w.status = "completed";
  w.txHash = txHash;
  w.processedAt = new Date();

  await w.save();
  res.send("Approved");
};

exports.reject = async (req, res) => {
  const { withdrawalId } = req.body;

  const w = await Withdrawal.findById(withdrawalId);
  const user = await User.findById(w.userId);

  user.balance += w.amount;

  w.status = "rejected";

  await user.save();
  await w.save();

  res.send("Rejected");
};

exports.getReferralInsights = async (req, res) => {
  try {
    const totalEarningsResult = await User.aggregate([
      { $group: { _id: null, total: { $sum: "$referralEarnings" } } }
    ]);
    const totalEarnings = totalEarningsResult[0]?.total || 0;

    const totalReferredUsers = await User.countDocuments({ referredBy: { $ne: null } });

    const topReferrers = await User.find({ referralEarnings: { $gt: 0 } })
      .sort({ referralEarnings: -1 })
      .limit(10)
      .select('email referralCode referralEarnings');

    res.json({
      totalEarnings,
      totalReferredUsers,
      topReferrers
    });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.getQueueStatus = async (req, res) => {
  try {
    const miningCounts = await miningQueue.getJobCounts('waiting', 'active', 'failed', 'delayed', 'completed');
    const mainCounts = await mainQueue.getJobCounts('waiting', 'active', 'failed', 'delayed', 'completed');

    res.json({
      miningQueue: miningCounts,
      mainQueue: mainCounts
    });
  } catch (error) {
    res.status(500).json({ error: "Could not retrieve queue status" });
  }
};

exports.getAnalytics = async (req, res) => {
  try {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const totalUsers = await User.countDocuments();
    const newUsers24h = await User.countDocuments({ createdAt: { $gte: last24h } });

    const miningStats = await User.aggregate([
      { $group: { _id: null, totalMined: { $sum: "$totalEarnedFromMining" }, totalReferral: { $sum: "$referralEarnings" } } }
    ]);

    const activeMiners = await User.countDocuments({ isMiningActive: true });
    const premiumUsers = await User.countDocuments({ isPremium: true });

    res.json({
      users: {
        total: totalUsers,
        new24h: newUsers24h,
        premium: premiumUsers,
        activeMiners
      },
      economics: {
        totalMined: miningStats[0]?.totalMined || 0,
        totalReferralPaid: miningStats[0]?.totalReferral || 0
      }
    });
  } catch (error) {
    res.status(500).json({ error: "Could not fetch analytics" });
  }
};

exports.getUsers = async (req, res) => {
  try {
    const users = await User.find({}, '-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: "Could not fetch users" });
  }
};

exports.toggleFlagUser = async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    user.isFlagged = !user.isFlagged;
    await user.save();

    res.json({ message: `User ${user.isFlagged ? 'flagged' : 'unflagged'} successfully`, isFlagged: user.isFlagged });
  } catch (error) {
    res.status(500).json({ error: "Could not toggle user flag" });
  }
};

exports.toggleAdminRole = async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    user.role = user.role === 'admin' ? 'user' : 'admin';
    await user.save();

    res.json({ message: `User role updated to ${user.role}`, role: user.role });
  } catch (error) {
    res.status(500).json({ error: "Could not toggle user role" });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await User.findByIdAndDelete(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    res.json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Could not delete user" });
  }
};
