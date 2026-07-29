const express = require("express");
const router = express.Router();
const Razorpay = require("razorpay");
const crypto = require("crypto");
const protect = require("../middleware/authMiddleware");
const Cart = require("../models/Cart");
const Order = require("../models/Order");
const Product = require("../models/Product");
const { getCustomerOrderReceipt, getAdminNewOrderAlert } = require("../utils/emailTemplates");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// CREATE ORDER
router.post("/create-order", protect, async (req, res) => {
  try {
    const { deliveryInstructions } = req.body;

    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    const totalAmount = cart.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    const options = {
      amount: totalAmount * 100,
      currency: "INR",
      receipt: "receipt_" + Date.now(),
    };

    const razorpayOrder = await razorpay.orders.create(options);

    // Save a PendingPayment Order in the database
    const pendingOrder = new Order({
      user: req.user._id,
      items: cart.items,
      totalAmount,
      customerName: req.user.username,
      mobile: req.user.mobile,
      address: req.user.address,
      deliveryInstructions: deliveryInstructions || "",
      status: "PendingPayment",
      razorpayOrderId: razorpayOrder.id,
    });
    await pendingOrder.save();

    res.json({ orderId: razorpayOrder.id, amount: totalAmount });
  } catch (error) {
    console.error("Razorpay order error:", error);
    res.status(500).json({ message: "Failed to create Razorpay order" });
  }
});

// VERIFY PAYMENT (DO NOT CREATE ORDER HERE)
router.post("/verify", protect, async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    } = req.body;

    const hmac = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET);
    hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
    const generatedSignature = hmac.digest("hex");

    if (generatedSignature === razorpay_signature) {
      return res.json({ message: "Payment verified" });
    }

    return res.status(400).json({ message: "Invalid payment signature" });

  } catch (error) {
    console.error("Payment verify error:", error);
    res.status(500).json({ message: "Verification failed" });
  }
});

// RAZORPAY WEBHOOK (DIRECT SERVER-TO-SERVER CAPTURE)
router.post("/webhook", async (req, res) => {
  try {
    const signature = req.headers["x-razorpay-signature"];
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    // Verify webhook signature (if webhook secret is configured)
    if (webhookSecret && signature) {
      const shasum = crypto.createHmac("sha256", webhookSecret);
      shasum.update(JSON.stringify(req.body));
      const digest = shasum.digest("hex");

      if (digest !== signature) {
        return res.status(400).json({ message: "Invalid webhook signature" });
      }
    }

    const event = req.body.event;
    
    if (event === "order.paid" || event === "payment.captured") {
      const paymentEntity = req.body.payload.payment.entity;
      const razorpayOrderId = paymentEntity.order_id;
      const razorpayPaymentId = paymentEntity.id;

      const order = await Order.findOne({ razorpayOrderId });
      if (order && order.status === "PendingPayment") {
        order.status = "Pending";
        order.razorpayPaymentId = razorpayPaymentId;
        await order.save();

        // Decrement stock levels
        for (const item of order.items) {
          await Product.findByIdAndUpdate(item.productId, {
            $inc: { stock: -item.quantity }
          });
        }

        // Clear user's cart
        const cart = await Cart.findOne({ user: order.user });
        if (cart) {
          cart.items = [];
          await cart.save();
        }

        // Send confirmation emails
        const User = require("../models/User");
        const user = await User.findById(order.user);
        const sendEmail = require("../utils/sendEmail");

        const productListTable = order.items
          .map(
            (item) => `
            <tr style="border-bottom: 1px solid #f0e6ff;">
              <td style="padding: 10px 0; font-size: 15px; color: #333;">
                <b>${item.name}</b> <span style="color: #887799; font-size: 13px;">(x${item.quantity})</span>
              </td>
              <td style="padding: 10px 0; font-size: 15px; color: #333; text-align: right; font-weight: bold;">
                ₹${item.price * item.quantity}
              </td>
            </tr>
          `
          )
          .join("");

        const adminEmailHtml = getAdminNewOrderAlert(
          order._id.toString(),
          order.customerName,
          order.mobile,
          order.address,
          productListTable,
          order.totalAmount,
          order.deliveryInstructions,
          true
        );

        const ADMIN_EMAILS = [
          "loheshwaran311@gmail.com",
          "srigayathri444@gmail.com",
          "gayathriviajaya01@gmail.com"
        ];

        for (const email of ADMIN_EMAILS) {
          try {
            await sendEmail(email, `New Order Received #${order._id.toString().slice(-6)} (Webhook)`, adminEmailHtml);
          } catch (err) {
            console.error("Webhook admin notification email failed:", err);
          }
        }

        if (user && user.email) {
          const customerEmailHtml = getCustomerOrderReceipt(
            order.customerName,
            order._id.toString(),
            order.address,
            order.mobile,
            productListTable,
            order.totalAmount,
            order.deliveryInstructions
          );
          try {
            await sendEmail(user.email, `Order Confirmation & Receipt #${order._id.toString().slice(-6)}`, customerEmailHtml);
          } catch (emailErr) {
            console.error("Webhook customer confirmation email failed:", emailErr);
          }
        }
      }
    }

    res.status(200).send("ok");
  } catch (err) {
    console.error("Webhook processing error:", err);
    res.status(500).send("Webhook handler failed");
  }
});

module.exports = router;
