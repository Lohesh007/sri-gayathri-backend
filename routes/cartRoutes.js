const express = require("express");
const router = express.Router();
const Cart = require("../models/Cart");

// ⭐ Only one import needed
const authenticate = require("../middleware/authMiddleware");

// Add to cart
router.post("/add", authenticate, async (req, res) => {
  const { productId, name, price, image } = req.body;
  const userId = req.user._id;

  try {
    let cart = await Cart.findOne({ user: userId });
    if (!cart) {
      cart = new Cart({ user: userId, items: [] });
    }

    const existingItem = cart.items.find(
      (item) =>
        (item.productId && item.productId.toString() === productId) ||
        item.name === name
    );

    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      cart.items.push({
        productId: productId || name,
        name,
        price,
        image,
      });
    }

    await cart.save();
    res.json({ message: "Item added to cart", cart });
  } catch (error) {
    console.error("Add to cart error:", error);
    res.status(500).json({ message: error.message });
  }
});

// Get user cart
router.get("/", authenticate, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });
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
