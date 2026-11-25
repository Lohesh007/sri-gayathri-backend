const express = require("express");
const router = express.Router();
const User = require("../models/User");
const PendingRegistration = require("../models/PendingRegistration");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const sendEmail = require("../utils/sendEmail");
const { getVerificationEmail, getResetPasswordEmail } = require("../utils/emailTemplates");
const authenticate = require("../middleware/authMiddleware");
const loginLimiter = require("../middleware/loginLimiter");
const rateLimit = require("express-rate-limit");
const registrationLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 8, standardHeaders: true, legacyHeaders: false, message: { message: "Too many registration attempts. Please try again later." } });
const passwordResetLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 5, standardHeaders: true, legacyHeaders: false, message: { message: "Too many password reset requests. Please try again later." } });

// Generate JWT
const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });


// =====================================================
// REGISTER → SEND EMAIL VERIFICATION
// =====================================================
router.post("/register", registrationLimiter, async (req, res) => {
  try {
    const { username, email, mobile, address, password } = req.body;
    if (!username || !email || !mobile || !address || !password) return res.status(400).json({ message: "All fields required" });
    if (typeof username !== "string" || username.trim().length < 2 || username.trim().length > 100) return res.status(400).json({ message: "Invalid username" });
    if (typeof address !== "string" || address.trim().length < 5 || address.trim().length > 1000) return res.status(400).json({ message: "Invalid address" });
    const normalizedEmail = String(email).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) return res.status(400).json({ message: "Invalid email address format" });
    if (!/^\d{10}$/.test(String(mobile))) return res.status(400).json({ message: "Mobile number must be a valid 10-digit number" });
    if (typeof password !== "string" || password.length < 8 || password.length > 128) return res.status(400).json({ message: "Password must be 8–128 characters long" });
    if (await User.findOne({ email: normalizedEmail })) return res.status(400).json({ message: "Email already registered" });
    if (await User.findOne({ mobile })) return res.status(400).json({ message: "Mobile already registered" });

    await PendingRegistration.deleteMany({ $or: [{ email: normalizedEmail }, { mobile }] });
    const passwordHash = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(verificationToken).digest("hex");
    await PendingRegistration.create({
      username: username.trim(), email: normalizedEmail, mobile, address: address.trim(),
      passwordHash, tokenHash, expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });

    const frontend = (process.env.FRONTEND_URL || "https://sri-gayathri-fancy-religious.netlify.app").replace(/\/$/, "");
    const verifyURL = `${frontend}/verify-email/${verificationToken}`;
    await sendEmail(normalizedEmail, "Verify Your Email", getVerificationEmail(username.trim(), verifyURL));
    res.json({ message: "Verification email sent! Check your inbox." });
  } catch (err) {
    console.error("Registration error:", err.message);
    res.status(500).json({ message: "Unable to start registration. Please try again." });
  }
});

router.get("/verify-email/:token", async (req, res) => {
  try {
    const tokenHash = crypto.createHash("sha256").update(req.params.token).digest("hex");
    const pending = await PendingRegistration.findOne({ tokenHash, expiresAt: { $gt: new Date() } });
    if (!pending) return res.status(400).send("Invalid or expired verification link.");
    if (await User.findOne({ $or: [{ email: pending.email }, { mobile: pending.mobile }] })) {
      await PendingRegistration.deleteOne({ _id: pending._id });
      return res.send("Account already registered. Please login.");
    }
    const isAdminUser = ADMIN_LIST.some((adm) => adm.email.toLowerCase() === pending.email && adm.mobile === pending.mobile);
    const user = new User({
      username: pending.username, email: pending.email, mobile: pending.mobile,
      address: pending.address, password: pending.passwordHash, isVerified: true, isAdmin: isAdminUser,
    });
    user.passwordHashIsPreHashed = true;
    await user.save();
    await PendingRegistration.deleteOne({ _id: pending._id });
    res.send("Email verified successfully! You can now login.");
  } catch (err) {
    if (err.code === 11000) return res.status(400).send("Email or mobile already registered. Please login.");
    console.error("Verification error:", err.message);
    res.status(400).send("Invalid or expired verification link.");
  }
});

router.post("/login", loginLimiter, async (req, res) => {
  try {
    const { credential, password } = req.body;

    const user = /^\d{10}$/.test(credential)
      ? await User.findOne({ mobile: credential })
      : await User.findOne({ email: credential });

    if (!user) return res.status(400).json({ message: "Invalid email/mobile or password" });
    if (!user.isVerified) return res.status(401).json({ message: "Verify your email first" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: "Invalid email/mobile or password" });

    // Dynamic Admin Role Synchronization
    const ADMIN_EMAILS_CHECK = [
      "loheshwaran311@gmail.com",
      "srigayathri444@gmail.com",
      "gayathrivijaya01@gmail.com"
    ];
    if (ADMIN_EMAILS_CHECK.includes(user.email) && !user.isAdmin) {
      user.isAdmin = true;
      await user.save();
    }

    const token = generateToken(user._id);

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({
      message: "Login successful",
      token: token,
      user: {
        username: user.username,
        email: user.email,
        mobile: user.mobile,
        address: user.address,
        isAdmin: user.isAdmin
      }
    });

  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});


// =====================================================
// FORGOT PASSWORD → SEND RESET LINK
// =====================================================
router.post("/forgot", passwordResetLimiter, async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.json({ message: "If this email is registered, a password reset link has been sent." });
    }

    // Dynamic secret containing password hash to ensure one-time reset use
    const resetSecret = process.env.JWT_SECRET + user.password;
    const resetToken = jwt.sign(
      { id: user._id },
      resetSecret,
      { expiresIn: "15m" }
    );

    const rawFrontend = process.env.FRONTEND_URL || "https://sri-gayathri-fancy-religious.netlify.app";
    const cleanFrontend = rawFrontend.includes("sri-gayathri-religious.netlify.app")
      ? "https://sri-gayathri-fancy-religious.netlify.app"
      : rawFrontend.replace(/\/$/, "");

    const resetUrl = `${cleanFrontend}/reset/${resetToken}`;
    const emailHtml = getResetPasswordEmail(resetUrl);

    await sendEmail(
      email,
      "Password Reset Request",
      emailHtml
    );

    res.json({ message: "If this email is registered, a password reset link has been sent." });

  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});


// =====================================================
// VERIFY RESET TOKEN (Page Load Check)
// =====================================================
router.get("/reset/:token", async (req, res) => {
  try {
    const decoded = jwt.decode(req.params.token);
    if (!decoded || !decoded.id) {
      return res.status(400).json({ message: "Invalid or expired reset link" });
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Verify token using secret composed of JWT_SECRET + current password hash
    jwt.verify(req.params.token, process.env.JWT_SECRET + user.password);

    res.json({ valid: true, message: "Reset link is valid" });
  } catch (err) {
    res.status(400).json({ message: "Invalid or expired reset link" });
  }
});


// =====================================================
// RESET PASSWORD
// =====================================================
router.post("/reset/:token", async (req, res) => {
  try {
    const { password } = req.body;

    if (!password || password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters long" });
    }

    // Decode token without verification to get user ID first
    const decoded = jwt.decode(req.params.token);
    if (!decoded || !decoded.id) {
      return res.status(400).json({ message: "Invalid or expired reset link" });
    }

    const user = await User.findById(decoded.id);
    if (!user)
      return res.status(404).json({ message: "User not found" });

    // Verify token using secret composed of JWT_SECRET + current password hash
    try {
      jwt.verify(req.params.token, process.env.JWT_SECRET + user.password);
    } catch (verifyErr) {
      return res.status(400).json({ message: "Invalid or expired reset link" });
    }

    user.password = password;
    await user.save();

    res.json({ message: "Password updated successfully" });

  } catch (err) {
    res.status(400).json({ message: "Invalid or expired reset link" });
  }
});


// =====================================================
// USER PROFILE (protected)
// =====================================================
router.get("/profile", authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Error fetching profile" });
  }
});


// =====================================================
// UPDATE PROFILE
// =====================================================
router.put("/update-profile", authenticate, async (req, res) => {
  try {
    const { username, mobile, address } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (username) user.username = username;
    if (mobile) {
      if (!/^\d{10}$/.test(mobile)) {
        return res.status(400).json({ message: "Mobile number must be a valid 10-digit number" });
      }
      const existingMobile = await User.findOne({ mobile, _id: { $ne: req.user._id } });
      if (existingMobile) {
        return res.status(400).json({ message: "Mobile number already registered by another account" });
      }
      user.mobile = mobile;
    }
    if (address) user.address = address;

    await user.save();

    res.json({
      message: "Profile updated successfully",
      user: {
        username: user.username,
        email: user.email,
        mobile: user.mobile,
        address: user.address,
      },
    });

  } catch (err) {
    res.status(500).json({ message: "Error updating profile" });
  }
});

// =====================================================
// LOGOUT
// =====================================================
router.post("/logout", (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  });
  res.json({ message: "Logged out successfully" });
});


module.exports = router;
