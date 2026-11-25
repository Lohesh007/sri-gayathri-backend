const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  mobile: { type: String, required: true, unique: true },
  address: { type: String, required: true },
  password: { type: String, required: true },
  isVerified: { type: Boolean, default: false },
  isAdmin: { type: Boolean, default: false },
});

// HASH PASSWORD. Internal verification flow may set passwordHashIsPreHashed
// only after loading a hashed value from PendingRegistration.
userSchema.pre("save", async function() {
  if (!this.isModified("password") || this.passwordHashIsPreHashed) return;
  this.password = await bcrypt.hash(this.password, 10);
});

module.exports = mongoose.model("User", userSchema);
