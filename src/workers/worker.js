const { Worker } = require('bullmq');
const redisConnection = require('../config/redis');
const logger = require('../utils/logger');

const worker = new Worker('mainQueue', async job => {
  logger.info(`Processing job: ${job.name} (ID: ${job.id})`);
  
  try {
    switch (job.name) {
      case 'processReferral':
        // Handle referral logic here
        break;
      case 'verifyTransaction':
        // Handle on-chain verification here
        break;
      default:
        logger.warn(`Unknown job type: ${job.name}`);
    }
  } catch (error) {
    logger.error(`Job ${job.id} failed: ${error.message}`);
    throw error;
  }
}, {
  connection: redisConnection,
});

worker.on('completed', job => {
  logger.info(`Job ${job.id} completed successfully.`);
});

worker.on('failed', (job, err) => {
  logger.error(`Job ${job.id} failed with error: ${err.message}`);
});

module.exports = worker;
