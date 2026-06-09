const { createClient } = require('redis');

let redisClient;

async function initRedis() {
  redisClient = createClient({
    url: 'redis://127.0.0.1:6379'
  });

  redisClient.on('error', (err) => console.error('Redis Client Error', err));

  await redisClient.connect();
  console.log('Redis connected');
  return redisClient;
}

function getRedis() {
  return redisClient;
}

module.exports = { initRedis, getRedis };
