const mongoose = require("mongoose");

const pendingRegistrationSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  mobile: { type: String, required: true },
  address: { type: String, required: true },
  passwordHash: { type: String, required: true },
  tokenHash: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
}, { timestamps: true });

pendingRegistrationSchema.index({ email: 1 });
pendingRegistrationSchema.index({ mobile: 1 });

module.exports = mongoose.model("PendingRegistration", pendingRegistrationSchema);
