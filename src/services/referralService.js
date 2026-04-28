const User = require('../models/User');
const Transaction = require('../models/Transaction');
const logger = require('../utils/logger');

/**
 * Distributes referral commission to the referrer when a referred user earns rewards.
 * 
 * @param {Object} user - The user who earned the amount.
 * @param {Number} earnedAmount - The amount earned by the user.
 * @returns {Promise<void>}
 */
const distributeReferralCommission = async (user, earnedAmount) => {
  try {
    // 1. If user has no referrer, return early
    if (!user.referredBy) {
      return;
    }

    // New Rule: Referred user must have earned at least 10 TAN total from mining
    if (user.totalEarnedFromMining < 10) {
      logger.debug(`Skipping referral commission: user ${user.email} has only earned ${user.totalEarnedFromMining} TAN from mining (min 10 required).`);
      return;
    }

    // 2. Atomic update: Find referrer and update balance/earnings in one query
    const commission = earnedAmount * 0.10;
    if (commission <= 0) return;

    const referrer = await User.findOneAndUpdate(
      { referralCode: user.referredBy },
      { 
        $inc: { balance: commission, referralEarnings: commission } 
      },
      { new: true, lean: true }
    );

    if (!referrer) {
      logger.warn(`Referrer with code ${user.referredBy} not found for user ${user._id}`);
      return;
    }

    // 3. Log Transaction (async)
    Transaction.create({
      userId: referrer._id,
      type: 'referral',
      amount: commission,
      status: 'completed',
      metadata: {
        fromUser: user._id,
        fromEmail: user.email,
        originalAmount: earnedAmount
      }
    }).catch(err => logger.error("Referral transaction log failed: %o", err));

    logger.info(`Distributed ${commission} referral commission to ${referrer.email} for user ${user.email}`);
  } catch (error) {
    logger.error('Error in distributeReferralCommission: %o', error);
  }
};

module.exports = {
  distributeReferralCommission,
};
