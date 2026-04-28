const User = require('../models/User');
const logger = require('../utils/logger');

/**
 * Detects multi-account abuse by checking for shared IP addresses or Device IDs.
 * 
 * @param {Object} user - The user document to check.
 * @returns {Promise<boolean>} - Returns true if the user was flagged.
 */
const detectMultiAccounts = async (user) => {
  try {
    if (!user.ipAddress && !user.deviceId) return false;

    // Build the query to find potential multi-accounts
    const query = {
      $or: []
    };

    if (user.ipAddress) query.$or.push({ ipAddress: user.ipAddress });
    if (user.deviceId) query.$or.push({ deviceId: user.deviceId });

    // Count unique users sharing these identifiers
    const count = await User.countDocuments(query);

    // Rule: More than 2 accounts sharing the same ID/IP is considered suspicious
    if (count > 2) {
      logger.warn(`Multi-account detected! Flagging accounts sharing IP: ${user.ipAddress} or Device: ${user.deviceId}`);
      
      // Flag all accounts involved in the multi-account group
      await User.updateMany(query, { $set: { isFlagged: true } });
      
      return true;
    }

    return false;
  } catch (error) {
    logger.error('Error in detectMultiAccounts: %o', error);
    return false;
  }
};

module.exports = {
  detectMultiAccounts,
};
