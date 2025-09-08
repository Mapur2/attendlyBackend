const redisClient = require('../db/redisClient.js');

// Generate random 6-digit OTP
const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Save OTP to Redis with TTL (e.g. 5 min)
 const saveOtp = async (userId, otp, ttlSeconds = 300) => {
  const key = `otp:${userId}`;
  await redisClient.setex(key,ttlSeconds,otp);
};

// Verify OTP
 const verifyOtp = async (userId, otp) => {
  const key = `otp:${userId}`;
  const storedOtp = await redisClient.get(key);

  if (!storedOtp) return { success: false, message: "OTP expired or not found" };

  if (storedOtp === otp) {
    // Delete OTP after successful verification (one-time use)
    await redisClient.del(key);
    return { success: true, message: "OTP verified" };
  }

  return { success: false, message: "Invalid OTP" };
};

module.exports={
    generateOtp,saveOtp,verifyOtp
}