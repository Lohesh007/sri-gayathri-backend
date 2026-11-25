const express = require("express");
const router = express.Router();
const Cart = require("../models/Cart");
const Product = require("../models/Product");
const authenticate = require("../middleware/authMiddleware");

const validQuantity = (q) => Number.isInteger(q) && q >= 1 && q <= 99;

// Add to cart
router.post("/add", authenticate, async (req, res) => {
  const { productId, name, image, quantity } = req.body;
  const quantityToAdd = quantity === undefined ? 1 : Number(quantity);
  if (!validQuantity(quantityToAdd)) return res.status(400).json({ message: "Quantity must be between 1 and 99" });
  try {
    const product = productId ? await Product.findById(productId) : await Product.findOne({ name });
    if (!product) return res.status(404).json({ message: "Product not found" });
    if (product.stock < quantityToAdd) return res.status(400).json({ message: "Insufficient stock" });
    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) cart = new Cart({ user: req.user._id, items: [] });
    const existingItem = cart.items.find((item) => item.productId?.toString() === product._id.toString());
    if (existingItem) {
      if (existingItem.quantity + quantityToAdd > 99 || existingItem.quantity + quantityToAdd > product.stock) return res.status(400).json({ message: "Requested quantity exceeds available stock" });
      existingItem.quantity += quantityToAdd;
      existingItem.price = product.price;
      existingItem.name = product.name;
      existingItem.image = product.image;
    } else {
      cart.items.push({ productId: product._id, name: product.name, price: product.price, image: product.image || image, quantity: quantityToAdd });
    }
    await cart.save();
    res.json({ message: "Item added to cart", cart });
  } catch (error) {
    res.status(400).json({ message: "Failed to add item to cart" });
  }
});

// Get cart for authenticated user
router.get("/", authenticate, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) return res.json({ items: [] });
    // Refresh cart display values from current product records.
    for (const item of cart.items) {
      const product = await Product.findById(item.productId);
      if (product) {
        item.price = product.price;
        item.name = product.name;
        item.image = product.image;
      }
    }
    await cart.save();
    await cart.populate("items.productId", "stock price");
    res.json(cart);
  } catch (error) {
    res.status(500).json({ message: "Failed to load cart" });
  }
});

// Update quantity
router.put("/update/:id", authenticate, async (req, res) => {
  try {
    const quantity = Number(req.body.quantity);
    if (!validQuantity(quantity)) return res.status(400).json({ message: "Quantity must be between 1 and 99" });
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) return res.status(404).json({ message: "Cart not found" });
    const item = cart.items.id(req.params.id);
    if (!item) return res.status(404).json({ message: "Item not found" });
    const product = await Product.findById(item.productId);
    if (!product) return res.status(404).json({ message: "Product no longer available" });
    if (quantity > product.stock) return res.status(400).json({ message: "Requested quantity exceeds available stock" });
    item.quantity = quantity;
    item.price = product.price;
    item.name = product.name;
    item.image = product.image;
    await cart.save();
    res.json({ message: "Quantity updated", cart });
  } catch (error) {
    res.status(400).json({ message: "Failed to update quantity" });
  }
});

// Remove item
router.delete("/remove/:id", authenticate, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) return res.status(404).json({ message: "Cart not found" });
    cart.items = cart.items.filter((item) => item._id.toString() !== req.params.id);
    await cart.save();
    res.json({ message: "Item removed", cart });
  } catch (error) {
    res.status(400).json({ message: "Failed to remove item" });
  }
});

module.exports = router;
