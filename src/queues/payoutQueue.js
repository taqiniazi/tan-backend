const { Queue } = require('bullmq');
const redisConnection = require('../config/redis');

const payoutQueue = new Queue('payoutQueue', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 5000,
    }
  }
});

module.exports = payoutQueue;
