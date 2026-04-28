const { Worker } = require('bullmq');
const redisConnection = require('../config/redis');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const referralService = require('../services/referralService');
const logger = require('../utils/logger');

const miningWorker = new Worker('miningRewards', async job => {
  const { userId } = job.data;
  
  try {
    const user = await User.findById(userId);
    if (!user) throw new Error(`User ${userId} not found`);

    if (!user.isMiningActive || !user.lastMiningStartTime) {
      logger.info(`Mining session for user ${userId} is not active or already processed.`);
      return;
    }

    const now = Date.now();
    const startTime = new Date(user.lastMiningStartTime).getTime();
    const hoursElapsed = Math.min((now - startTime) / 3600000, 24);
    
    const earned = parseFloat((hoursElapsed * user.miningRate).toFixed(8));
    if (earned <= 0) return;

    // Atomic update
    const updatedUser = await User.findOneAndUpdate(
      { _id: userId, isMiningActive: true },
      { 
        $inc: { balance: earned, totalEarnedFromMining: earned },
        $set: { isMiningActive: false, lastMiningStartTime: null }
      },
      { new: true }
    );

    if (!updatedUser) return;

    // Log Transaction
    await Transaction.create({
      userId: updatedUser._id,
      type: 'mining',
      amount: earned,
      status: 'completed',
      metadata: { hoursMined: hoursElapsed, rate: user.miningRate, processedBy: 'worker' }
    });

    // Distribute referral commission
    await referralService.distributeReferralCommission(updatedUser, earned);

    logger.info(`Auto-claimed ${earned} TAN for user ${updatedUser.email} via worker`);
  } catch (error) {
    logger.error(`Mining worker error for job ${job.id}: ${error.message}`);
    throw error; // Trigger BullMQ retry
  }
}, {
  connection: redisConnection,
  concurrency: 5 // Process up to 5 users simultaneously
});

module.exports = miningWorker;
