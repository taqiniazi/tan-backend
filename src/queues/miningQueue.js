const { Queue } = require('bullmq');
const redisConnection = require('../config/redis');

const miningQueue = new Queue('miningRewards', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: true,
  }
});

module.exports = miningQueue;
