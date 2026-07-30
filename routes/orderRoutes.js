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
  getAdminShippingUpdateAlert
} = require("../utils/emailTemplates");
const crypto = require("crypto");

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
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, deliveryInstructions } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ message: "Missing payment details" });
    }

    // Verify Razorpay Payment Signature
    const hmac = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET);
    hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
    const generatedSignature = hmac.digest("hex");

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({ message: "Invalid payment signature" });
    }

    // 1. Check if the order was already completed by the webhook
    const existingOrder = await Order.findOne({ razorpayOrderId: razorpay_order_id });
    if (existingOrder && existingOrder.status !== "PendingPayment") {
      return res.json({ message: "Order placed successfully", order: existingOrder });
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

    // Verify stock levels before saving order
    for (const item of cart.items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(404).json({ message: `Product ${item.name} not found` });
      }
      if (product.stock < item.quantity) {
        return res.status(400).json({ message: `Insufficient stock for ${item.name}. Available: ${product.stock}` });
      }
    }

    // Calculate total
    const totalAmount = cart.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    // Order summary HTML table for Email Templates
    const productListTable = cart.items
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

    // 3. Update the existing PendingPayment order, or create it if not found
    let order = existingOrder;
    if (order) {
      order.status = "Pending";
      order.razorpayPaymentId = razorpay_payment_id;
      order.deliveryInstructions = deliveryInstructions || order.deliveryInstructions || "";
      await order.save();
    } else {
      order = new Order({
        user: req.user._id,
        items: cart.items,
        totalAmount,
        customerName: req.user.username,
        mobile: req.user.mobile,
        address: req.user.address,
        deliveryInstructions: deliveryInstructions || "",
        status: "Pending",
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
      });
      await order.save();
    }

    // Decrement stock levels
    for (const item of cart.items) {
      await Product.findByIdAndUpdate(item.productId, {
        $inc: { stock: -item.quantity }
      });
    }

    // Clear cart
    cart.items = [];
    await cart.save();

    /* ======================================================
            SEND EMAIL NOTIFICATION TO ADMINS
       ====================================================== */
    const adminEmailHtml = getAdminNewOrderAlert(
      order._id.toString(),
      req.user.username,
      req.user.mobile,
      req.user.address,
      productListTable,
      totalAmount,
      deliveryInstructions
    );

    for (const email of ADMIN_EMAILS) {
      try {
        await sendEmail(email, `New Order Received #${order._id.toString().slice(-6)}`, adminEmailHtml);
      } catch (adminEmailErr) {
        console.error("Admin order notification email failed:", adminEmailErr);
      }
    }

    // Send confirmation & receipt to the customer
    const customerEmailHtml = getCustomerOrderReceipt(
      req.user.username,
      order._id.toString(),
      req.user.address,
      req.user.mobile,
      productListTable,
      totalAmount,
      deliveryInstructions
    );

    try {
      await sendEmail(req.user.email, `Order Confirmation & Receipt #${order._id.toString().slice(-6)}`, customerEmailHtml);
    } catch (emailErr) {
      console.error("Customer confirmation email failed:", emailErr);
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

    if (order.user.toString() !== req.user._id.toString()) {
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
    const orders = await Order.find({}).sort({ createdAt: -1 }).populate("user", "username email mobile");
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
