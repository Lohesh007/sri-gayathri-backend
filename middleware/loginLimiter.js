const rateLimit = require("express-rate-limit");

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // max 5 attempts per windowMs
  message: {
    message: "Too many login attempts. Please try again after 15 minutes."
  },
  validate: { trustProxy: false }
});

module.exports = loginLimiter;
