// config/redis.js
const Redis = require("ioredis");

const redisClient = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: process.env.REDIS_PORT || 6379,
});

// User online status management
const userStatus = {
  setOnline: (userId) => {
    return redisClient.set(`user:${userId}:online`, "true");
  },
  setOffline: (userId) => {
    return redisClient.del(`user:${userId}:online`);
  },
  isOnline: async (userId) => {
    const status = await redisClient.get(`user:${userId}:online`);
    return status === "true";
  },
};

redisClient.on("error", (err) => {
  console.error("Redis Client Error", err);
});

module.exports = {
  redisClient,
  userStatus,
};
