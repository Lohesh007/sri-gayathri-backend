const express = require("express");
const router = express.Router();
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const sendEmail = require("../utils/sendEmail");
const authenticate = require("../middleware/authMiddleware");

// Generate JWT
const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });


// =====================================================
// REGISTER → SEND EMAIL VERIFICATION
// =====================================================
router.post("/register", async (req, res) => {
  try {
    const { username, email, mobile, address, password } = req.body;

    if (!username || !email || !mobile || !address || !password)
      return res.status(400).json({ message: "All fields required" });

    if (await User.findOne({ email }))
      return res.status(400).json({ message: "Email already registered" });

    if (await User.findOne({ mobile }))
      return res.status(400).json({ message: "Mobile already registered" });

    const token = jwt.sign(
      { username, email, mobile, address, password },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    const verifyURL = `${process.env.FRONTEND_URL}/verify-email/${token}`;

    await sendEmail(
      email,
      "Verify Your Email",
      `
      <h2>Welcome to Sri Gayathri Religious</h2>
      <p>Click the link below to verify your account:</p>
      <a href="${verifyURL}" target="_blank">${verifyURL}</a>
      `
    );

    res.json({ message: "Verification email sent! Check your inbox." });

  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});


// =====================================================
// EMAIL VERIFICATION
// =====================================================
const ADMIN_LIST = [
  { email: "loheshwaran311@gmail.com", mobile: "9597580853" },
  { email: "srigayathri444@gmail.com", mobile: "9842004217" },
  { email: "gayathriviajaya01@gmail.com", mobile: "9443821417" }
];

router.get("/verify-email/:token", async (req, res) => {
  try {
    const decoded = jwt.verify(req.params.token, process.env.JWT_SECRET);
    const { username, email, mobile, address, password } = decoded;

    if (await User.findOne({ email })) {
      return res.send("Email already verified. Please login.");
    }

    const isAdminUser = ADMIN_LIST.some(
      adm => adm.email === email && adm.mobile === mobile
    );

    const user = new User({
      username,
      email,
      mobile,
      address,
      password,
      isVerified: true,
      isAdmin: isAdminUser
    });

    await user.save();

    res.send("Email verified successfully! You can now login.");

  } catch (err) {
    res.status(400).send("Invalid or expired verification link.");
  }
});


// =====================================================
// LOGIN
// =====================================================
router.post("/login", async (req, res) => {
  try {
    const { credential, password } = req.body;

    const user = /^\d{10}$/.test(credential)
      ? await User.findOne({ mobile: credential })
      : await User.findOne({ email: credential });

    if (!user) return res.status(400).json({ message: "Account not found" });
    if (!user.isVerified) return res.status(401).json({ message: "Verify your email first" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: "Wrong password" });

    const token = generateToken(user._id);

    res.json({
      message: "Login successful",
      token,
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
router.post("/forgot", async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user)
      return res.status(404).json({ message: "Email not found" });

    const resetToken = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    const resetUrl = `${process.env.FRONTEND_URL}/reset/${resetToken}`;

    await sendEmail(
      email,
      "Password Reset Request",
      `
        <h2>Password Reset</h2>
        <p>Click the link below to reset password:</p>
        <a href="${resetUrl}" target="_blank">${resetUrl}</a>
        <p>This link expires in 15 minutes.</p>
      `
    );

    res.json({ message: "Reset link sent to your email." });

  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});


// =====================================================
// RESET PASSWORD
// =====================================================
router.post("/reset/:token", async (req, res) => {
  try {
    const { password } = req.body;

    const decoded = jwt.verify(req.params.token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user)
      return res.status(404).json({ message: "User not found" });

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
    if (mobile) user.mobile = mobile;
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


module.exports = router;
