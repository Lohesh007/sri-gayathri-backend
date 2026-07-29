const express = require("express");
const router = express.Router();
const Cart = require("../models/Cart");
const Product = require("../models/Product");

// ⭐ Only one import needed
const authenticate = require("../middleware/authMiddleware");

// Add to cart
router.post("/add", authenticate, async (req, res) => {
  const { productId, name, image, quantity } = req.body;
  const userId = req.user._id;
  const quantityToAdd = Math.max(1, Number(quantity) || 1);

  try {
    let product;
    if (productId) {
      product = await Product.findById(productId);
    } else {
      product = await Product.findOne({ name });
    }

    if (!product) {
      return res.status(404).json({ message: "Product not found in database" });
    }

    const verifiedPrice = product.price;

    let cart = await Cart.findOne({ user: userId });
    if (!cart) {
      cart = new Cart({ user: userId, items: [] });
    }

    const existingItem = cart.items.find(
      (item) =>
        (item.productId && item.productId.toString() === product._id.toString()) ||
        item.name === product.name
    );

    if (existingItem) {
      existingItem.quantity += quantityToAdd;
    } else {
      cart.items.push({
        productId: product._id,
        name: product.name,
        price: verifiedPrice,
        image: product.image || image,
        quantity: quantityToAdd,
      });
    }

    await cart.save();
    res.json({ message: "Item added to cart", cart });
  } catch (error) {
    console.error("Add to cart error:", error);
    res.status(500).json({ message: "Failed to add item to cart" });
  }
});

// Get user cart
router.get("/", authenticate, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id }).populate("items.productId", "stock");
    res.json(cart || { items: [] });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update quantity
router.put("/update/:id", authenticate, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    const item = cart.items.id(req.params.id);
    if (!item) return res.status(404).json({ message: "Item not found" });

    item.quantity = req.body.quantity;
    await cart.save();

    res.json({ message: "Quantity updated", cart });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Remove item
router.delete("/remove/:id", authenticate, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    cart.items = cart.items.filter(
      (item) => item._id.toString() !== req.params.id
    );
    await cart.save();

    res.json({ message: "Item removed", cart });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
