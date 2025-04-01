// config/redis.js
const Redis = require("ioredis");

const redisClient = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: process.env.REDIS_PORT || 6379,
});

// User online status management
const userStatus = {
  setOnline: (userId,socketId) => {
    return redisClient.set(`user:${userId}`, socketId);
  },
  setOffline: (userId) => {
    return redisClient.del(`user:${userId}`);
  },
  isOnline: async (userId) => {
    const status = await redisClient.get(`user:${userId}`);
    return status !== null;
  },
  getUserSocketId:async(userId)=>{
    return await redisClient.get(`user:${userId}`);
  }
  
};

redisClient.on("error", (err) => {
  console.error("Redis Client Error", err);
});

module.exports = {
  redisClient,
  userStatus,
};
