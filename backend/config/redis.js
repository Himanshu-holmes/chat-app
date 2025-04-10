// config/redis.js
const Redis = require("ioredis");

const redisClient = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: process.env.REDIS_PORT || 6379,
});

// User online status management
const userStatus = {
  setOnline: (username,socketId) => {
    return redisClient.set(`user:${username}`, socketId);
  },
  setOffline: (username) => {
    return redisClient.del(`user:${username}`);
  },
  isOnline: async (username) => {
    const status = await redisClient.get(`user:${username}`);
    return status !== null;
  },
  getUserSocketId:async(username)=>{
    return await redisClient.get(`user:${username}`);
  } 
};
const userPbK = {
  setPbk:async(username,pbk)=>{
    return await redisClient.set(`pbk:${username}`,pbk)
  },
  getPbk:async(username)=>{
    return await redisClient.get(`pbk:${username}`)
  }
}

redisClient.on("error", (err) => {
  console.error("Redis Client Error", err);
});

module.exports = {
  redisClient,
  userStatus,
  userPbK
};
