const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },

  items: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
      name: String,
      price: Number,
      quantity: { type: Number, default: 1 },
      image: String,
    },
  ],

  totalAmount: { type: Number, required: true },

  // NEW FIELDS (required for admin/order notification)
  customerName: { type: String },        // auto filled from user.username
  mobile: { type: String },              // auto filled from user.mobile
  address: { type: String },             // auto filled from user.address
  deliveryInstructions: { type: String }, // User custom notes for delivery
  
  status: { type: String, default: "Pending" },
  razorpayOrderId: { type: String },
  razorpayPaymentId: { type: String, unique: true, sparse: true },
  createdAt: { type: Date, default: Date.now },
});

const Order = mongoose.model("Order", orderSchema);
module.exports = Order;
