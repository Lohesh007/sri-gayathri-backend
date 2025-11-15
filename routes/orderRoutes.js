const express = require("express");
const router = express.Router();
const Order = require("../models/Order");
const Cart = require("../models/Cart");
const authenticate = require("../middleware/authMiddleware");
const sendEmail = require("../utils/sendEmail");

// ADMIN EMAILS
const ADMIN_EMAILS = [
  "loheshwaran311@gmail.com",
  "srigayathri444@gmail.com",
  "gayathriviajaya01@gmail.com"
];

/* ======================================================
      1️⃣  PLACE ORDER  (AFTER PAYMENT SUCCESS)
   ====================================================== */
router.post("/place", authenticate, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    // Calculate total
    const totalAmount = cart.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    // Order summary for Email
    const productList = cart.items
      .map(
        (item) =>
          `• <b>${item.name}</b> (x${item.quantity}) — ₹${item.price * item.quantity}`
      )
      .join("<br>");

    // Save order to database
    const order = new Order({
      user: req.user._id,
      items: cart.items,
      totalAmount,
      customerName: req.user.username,
      mobile: req.user.mobile,
      address: req.user.address,
      status: "Pending",
    });

    await order.save();

    // Clear cart
    cart.items = [];
    await cart.save();

    /* ======================================================
            SEND EMAIL NOTIFICATION TO ADMINS
       ====================================================== */
    const message = `
      <h2>📦 NEW ORDER RECEIVED</h2>

      <p><b>Customer Name:</b> ${req.user.username}</p>
      <p><b>Mobile:</b> ${req.user.mobile}</p>
      <p><b>Delivery Address:</b> ${req.user.address}</p>

      <h3>🛍 Ordered Items:</h3>
      ${productList}

      <p><b>Total Amount:</b> ₹${totalAmount}</p>

      <hr>
      <p>This is an automatic notification from Sri Gayathri Religious website.</p>
    `;

    for (const email of ADMIN_EMAILS) {
      await sendEmail(email, "New Order Received", message);
    }

    return res.json({ message: "Order placed successfully", order });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Order failed" });
  }
});

/* ======================================================
      2️⃣  GET ALL ORDERS OF LOGGED-IN USER
   ====================================================== */
router.get("/", authenticate, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/* ======================================================
      3️⃣  USER CANCEL ORDER  (ONLY BEFORE SHIPPED)
   ====================================================== */
router.put("/cancel/:id", authenticate, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) return res.status(404).json({ message: "Order not found" });

    if (order.status === "Shipped" || order.status === "Delivered") {
      return res.status(400).json({ message: "Cannot cancel shipped order" });
    }

    order.status = "Cancelled";
    await order.save();

    res.json({ message: "Order cancelled successfully", order });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ======================================================
      4️⃣  ADMIN UPDATE ORDER STATUS
      Allowed: Pending, Processing, Shipped, Delivered, Cancelled
   ====================================================== */
router.put("/status/:id", authenticate, async (req, res) => {
  try {
    const { status } = req.body;

    const allowed = ["Pending", "Processing", "Shipped", "Delivered", "Cancelled"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    order.status = status;
    await order.save();

    res.json({ message: "Order status updated", order });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
// GET ALL ORDERS (ADMIN)
router.get("/all", authenticate, async (req, res) => {
  try {
    if (!req.user?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    const orders = await Order.find({}).sort({ createdAt: -1 }).populate("user", "username email mobile");
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
