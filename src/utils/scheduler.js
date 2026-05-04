const cron = require("node-cron");
const { awardMonthlyRewards } = require("../controllers/leaderboardController");
const logger = require("./logger");

const initScheduler = () => {
  // Schedule monthly rewards at 00:00 on the 1st of every month
  // This effectively processes "month end" rewards
  cron.schedule("0 0 1 * *", async () => {
    logger.info("Running scheduled monthly leaderboard rewards...");
    await awardMonthlyRewards();
  });

  logger.info("Scheduler initialized: Monthly leaderboard rewards scheduled for 1st of every month at 00:00.");
};

module.exports = { initScheduler };
