const { Queue } = require('bullmq');
const redisConnection = require('../config/redis');

const mainQueue = new Queue('mainQueue', {
  connection: redisConnection,
});

module.exports = mainQueue;
