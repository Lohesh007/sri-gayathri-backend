const express = require("express");
const router = express.Router();
const Order = require("../models/Order");
const Cart = require("../models/Cart");
const Product = require("../models/Product");
const authenticate = require("../middleware/authMiddleware");
const isAdmin = require("../middleware/isAdmin");
const sendEmail = require("../utils/sendEmail");
const {
  getCustomerOrderReceipt,
  getOrderStatusUpdateEmail,
  getAdminNewOrderAlert,
  getAdminShippingUpdateAlert,
  getAdminOrderCancelledAlert
} = require("../utils/emailTemplates");
const crypto = require("crypto");
const escapeHtml = (value = "") => String(value).replace(/[&<>"']/g, (char) => {
  switch (char) {
    case "&": return "&amp;";
    case "<": return "&lt;";
    case ">": return "&gt;";
    case "\"": return "&quot;";
    case "'": return "&#39;";
    default: return char;
  }
});


// ADMIN EMAILS
const ADMIN_EMAILS = [
  "loheshwaran311@gmail.com",
  "srigayathri444@gmail.com",
  "gayathrivijaya01@gmail.com"
];

/* ======================================================
      1️⃣  PLACE ORDER  (AFTER PAYMENT SUCCESS)
   ====================================================== */
router.post("/place", authenticate, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, deliveryInstructions } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ message: "Missing payment details" });
    }

    // Verify Razorpay Payment Signature
    const hmac = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET);
    hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
    const generatedSignature = hmac.digest("hex");

    const suppliedSignature = Buffer.from(String(razorpay_signature || ""), "utf8");
    const expectedSignature = Buffer.from(generatedSignature, "utf8");
    if (suppliedSignature.length !== expectedSignature.length || !crypto.timingSafeEqual(suppliedSignature, expectedSignature)) {
      return res.status(400).json({ message: "Invalid payment signature" });
    }

    // Payment must match a pending order created for the current account.
    const existingOrder = await Order.findOne({ razorpayOrderId: razorpay_order_id });
    if (!existingOrder || existingOrder.user.toString() !== req.user._id.toString()) {
      return res.status(400).json({ message: "Payment order not found for this account" });
    }
    if (existingOrder.status !== "PendingPayment") {
      if (existingOrder.razorpayPaymentId === razorpay_payment_id) {
        return res.json({ message: "Order placed successfully", order: existingOrder });
      }
      return res.status(409).json({ message: "This order has already been processed with a different payment" });
    }

    // 2. Check for double spending / payment replay attack
    const duplicatePayment = await Order.findOne({ razorpayPaymentId: razorpay_payment_id });
    if (duplicatePayment) {
      return res.status(400).json({ message: "This payment has already been processed for an order" });
    }

    const cart = await Cart.findOne({ user: req.user._id });

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    // Use the saved checkout snapshot rather than mutable cart contents.
    const paidItems = existingOrder.items;
    if (!paidItems || paidItems.length === 0) return res.status(400).json({ message: "Pending order has no items" });
    for (const item of paidItems) {
      const product = await Product.findById(item.productId);
      if (!product) return res.status(400).json({ message: `Product ${item.name} is no longer available` });
      if (!Number.isInteger(item.quantity) || item.quantity < 1 || product.stock < item.quantity) {
        return res.status(409).json({ message: `Insufficient stock for ${item.name}. Available: ${product.stock}` });
      }
    }
    const totalAmount = existingOrder.totalAmount;
    const productListTable = paidItems
      .map(
        (item) => `
        <tr style="border-bottom: 1px solid #f0e6ff;">
          <td style="padding: 10px 0; font-size: 15px; color: #333;">
            <b>${escapeHtml(item.name)}</b> <span style="color: #887799; font-size: 13px;">(x${item.quantity})</span>
          </td>
          <td style="padding: 10px 0; font-size: 15px; color: #333; text-align: right; font-weight: bold;">
            ₹${item.price * item.quantity}
          </td>
        </tr>
      `
      )
      .join("");

    // Atomically claim this pending payment so webhook retries or concurrent requests cannot fulfill it twice.
    const order = await Order.findOneAndUpdate(
      { _id: existingOrder._id, status: "PendingPayment", user: req.user._id },
      { $set: { status: "Pending", razorpayPaymentId: razorpay_payment_id, deliveryInstructions: deliveryInstructions || existingOrder.deliveryInstructions || "" } },
      { new: true }
    );
    if (!order) {
      const currentOrder = await Order.findById(existingOrder._id);
      if (currentOrder && currentOrder.razorpayPaymentId === razorpay_payment_id) return res.json({ message: "Order placed successfully", order: currentOrder });
      return res.status(409).json({ message: "Payment is already being processed" });
    }

    // Decrement stock from the immutable checkout snapshot with rollback on partial failure.
    const decremented = [];
    for (const item of paidItems) {
      const stockUpdate = await Product.updateOne(
        { _id: item.productId, stock: { $gte: item.quantity } },
        { $inc: { stock: -item.quantity } }
      );
      if (stockUpdate.modifiedCount !== 1) {
        for (const prior of decremented) await Product.updateOne({ _id: prior.productId }, { $inc: { stock: prior.quantity } });
        order.status = "StockIssue";
        await order.save();
        return res.status(409).json({ message: "Payment received, but stock changed. Please contact support.", orderId: order._id });
      }
      decremented.push({ productId: item.productId, quantity: item.quantity });
    }

    // Prepare email HTML templates
    const adminEmailHtml = getAdminNewOrderAlert(
      order._id.toString(),
      order.customerName,
      order.mobile,
      order.address,
      productListTable,
      totalAmount,
      deliveryInstructions
    );

    const customerEmailHtml = getCustomerOrderReceipt(
      order.customerName,
      order._id.toString(),
      order.address,
      order.mobile,
      productListTable,
      totalAmount,
      deliveryInstructions
    );

    // Send response immediately so customer gets instant confirmation!
    res.json({ message: "Order placed successfully", order });

    // Send emails in background (non-blocking)
    (async () => {
      for (const email of ADMIN_EMAILS) {
        try {
          await sendEmail(email, `New Order Received #${order._id.toString().slice(-6)}`, adminEmailHtml);
        } catch (adminEmailErr) {
          console.error("Admin order notification email failed:", adminEmailErr);
        }
      }

      if (req.user && req.user.email) {
        try {
          await sendEmail(req.user.email, `Order Confirmation & Receipt #${order._id.toString().slice(-6)}`, customerEmailHtml);
        } catch (emailErr) {
          console.error("Customer confirmation email failed:", emailErr);
        }
      }
    })();

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
    const orders = await Order.find({ user: req.user._id, status: { $ne: "PendingPayment" } }).sort({ createdAt: -1 });
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
    const order = await Order.findById(req.params.id).populate("user", "username email");

    if (!order) return res.status(404).json({ message: "Order not found" });

    if (order.user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "You can only cancel your own orders" });
    }

    if (order.status === "Cancelled") {
      return res.status(400).json({ message: "Order is already cancelled" });
    }

    if (order.status === "Shipped" || order.status === "Delivered") {
      return res.status(400).json({ message: "Cannot cancel shipped or delivered orders" });
    }

    order.status = "Cancelled";
    await order.save();

    // Return stock to inventory
    for (const item of order.items) {
      if (item.productId) {
        await Product.findByIdAndUpdate(item.productId, {
          $inc: { stock: item.quantity }
        });
      }
    }

    // Send email to customer confirming cancellation
    if (order.user && order.user.email) {
      const customerEmailHtml = getOrderStatusUpdateEmail(
        order.user.username || order.customerName || "Customer",
        order._id.toString(),
        "Cancelled"
      );
      try {
        await sendEmail(order.user.email, "Order Cancellation Confirmation", customerEmailHtml);
      } catch (emailErr) {
        console.error("Customer cancellation email failed:", emailErr);
      }
    }

    // Send email to admins notifying cancellation
    const adminEmailHtml = getAdminOrderCancelledAlert(
      order._id.toString(),
      order.customerName || (order.user && order.user.username) || "Customer",
      order.totalAmount
    );
    for (const email of ADMIN_EMAILS) {
      try {
        await sendEmail(email, `Order Cancelled by Customer #${order._id.toString().slice(-6)}`, adminEmailHtml);
      } catch (adminEmailErr) {
        console.error("Admin cancellation email alert failed:", adminEmailErr);
      }
    }

    res.json({ message: "Order cancelled successfully", order });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ======================================================
      4️⃣  ADMIN UPDATE ORDER STATUS
      Allowed: Pending, Processing, Shipped, Delivered, Cancelled
   ====================================================== */
router.put("/status/:id", authenticate, isAdmin, async (req, res) => {
  try {
    const { status } = req.body;

    const allowed = ["Pending", "Processing", "Shipped", "Delivered", "Cancelled"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    const order = await Order.findById(req.params.id).populate("user", "username email");
    if (!order) return res.status(404).json({ message: "Order not found" });

    const oldStatus = order.status;
    if (oldStatus === "PendingPayment") {
      return res.status(400).json({ message: "Cannot modify status of an unpaid order" });
    }
    if (oldStatus === "Cancelled" || oldStatus === "Delivered") {
      return res.status(400).json({ message: `Cannot change status of a ${oldStatus} order` });
    }

    order.status = status;
    await order.save();

    // If order was cancelled, return stock to inventory
    if (status === "Cancelled" && oldStatus !== "Cancelled") {
      for (const item of order.items) {
        if (item.productId) {
          await Product.findByIdAndUpdate(item.productId, {
            $inc: { stock: item.quantity }
          });
        }
      }
    }

    // If order is uncounselled, decrement stock
    if (oldStatus === "Cancelled" && status !== "Cancelled") {
      for (const item of order.items) {
        if (item.productId) {
          await Product.findByIdAndUpdate(item.productId, {
            $inc: { stock: -item.quantity }
          });
        }
      }
    }

    // Send email to customer on order status update
    if (order.user && order.user.email) {
      const emailHtml = getOrderStatusUpdateEmail(
        order.user.username || order.customerName || "Customer",
        order._id.toString(),
        status
      );
      try {
        await sendEmail(order.user.email, `Order Status Updated: ${status}`, emailHtml);
      } catch (emailErr) {
        console.error("Order status update email failed:", emailErr);
      }
    }

    res.json({ message: "Order status updated", order });

  } catch (err) {
    console.error("Error updating order status:", err);
    res.status(500).json({ message: err.message });
  }
});
// GET ALL ORDERS (ADMIN)
router.get("/all", authenticate, isAdmin, async (req, res) => {
  try {
    const orders = await Order.find({ status: { $ne: "PendingPayment" } }).sort({ createdAt: -1 }).populate("user", "username email mobile");
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 5️⃣ USER UPDATE SHIPPING DETAILS OF PLACED ORDER (ONLY BEFORE SHIPPED)
router.put("/:id/update-shipping", authenticate, async (req, res) => {
  try {
    const { customerName, mobile, address, deliveryInstructions } = req.body;
    
    if (!address || !address.trim()) {
      return res.status(400).json({ message: "Address is required" });
    }
    if (!mobile || !/^\d{10}$/.test(mobile)) {
      return res.status(400).json({ message: "Valid 10-digit mobile number is required" });
    }
    if (!customerName || !customerName.trim()) {
      return res.status(400).json({ message: "Name is required" });
    }

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "You can only update your own orders" });
    }

    if (order.status === "Cancelled") {
      return res.status(400).json({ message: "Cannot update shipping of a cancelled order" });
    }

    if (order.status === "Shipped" || order.status === "Delivered") {
      return res.status(400).json({ message: "Cannot update shipping once order is Shipped or Delivered" });
    }

    order.customerName = customerName;
    order.mobile = mobile;
    order.address = address;
    order.deliveryInstructions = deliveryInstructions || "";
    
    await order.save();

    // Send notification email to admin about shipping details change
    const adminEmailHtml = getAdminShippingUpdateAlert(
      order._id.toString(),
      customerName,
      mobile,
      address,
      deliveryInstructions
    );
    for (const email of ADMIN_EMAILS) {
      try {
        await sendEmail(email, `Order #${order._id.toString().slice(-6)} Shipping Details Updated`, adminEmailHtml);
      } catch (err) {
        console.error("Admin notification email failed:", err);
      }
    }

    res.json({ message: "Shipping details updated successfully", order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
