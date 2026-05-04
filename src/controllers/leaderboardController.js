const User = require("../models/User");
const Transaction = require("../models/Transaction");
const logger = require("../utils/logger");

exports.getLeaderboard = async (req, res) => {
  try {
    // Get top 10 users by balance (or totalEarnedFromMining)
    // The user said "Top 3 token earner", so we'll fetch top 10 and display top 3 on UI maybe? 
    // Or just fetch top 3. Let's fetch top 10 for more data if needed.
    const topEarners = await User.find({ role: "user", isFlagged: false })
      .sort({ balance: -1 })
      .limit(10)
      .select("name email profileImage balance country");

    res.status(200).json({
      success: true,
      data: topEarners
    });
  } catch (error) {
    logger.error("Error fetching leaderboard: %o", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
};

exports.awardMonthlyRewards = async () => {
  try {
    logger.info("Starting monthly leaderboard reward distribution...");

    const top3 = await User.find({ role: "user", isFlagged: false })
      .sort({ balance: -1 })
      .limit(3);

    if (top3.length === 0) {
      logger.info("No users found for rewards.");
      return;
    }

    const rewards = [1000, 700, 500];

    for (let i = 0; i < top3.length; i++) {
      const user = top3[i];
      const rewardAmount = rewards[i];

      user.balance += rewardAmount;
      await user.save();

      await Transaction.create({
        userId: user._id,
        type: "reward", // Reward for leaderboard rank
        amount: rewardAmount,
        status: "completed",
        metadata: {
          rank: i + 1,
          description: `Leaderboard Monthly Reward - Rank ${i + 1}`
        }
      });

      logger.info(`Awarded ${rewardAmount} tokens to ${user.email} (Rank ${i + 1})`);
    }

    logger.info("Monthly leaderboard reward distribution completed.");
  } catch (error) {
    logger.error("Error awarding monthly rewards: %o", error);
  }
};
