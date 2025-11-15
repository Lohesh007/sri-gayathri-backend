const rateLimit = require("express-rate-limit");

const otpLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 3, // max 3 OTP requests per 5 minutes
  message: {
    message: "Too many OTP requests. Please wait 5 minutes."
  }
});

module.exports = otpLimiter;
