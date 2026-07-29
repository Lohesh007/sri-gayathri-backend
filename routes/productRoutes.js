const express = require("express");
const router = express.Router();
const Product = require("../models/Product");
const protect = require("../middleware/authMiddleware");
const isAdmin = require("../middleware/isAdmin");

// ➕ Add Product (admin only)
router.post("/add", protect, isAdmin, async (req, res) => {
  try {
    // optionally check admin privileges inside protect
    const { name, category, subcategory, image, images, mrp, price, stock, description } = req.body;
    const product = new Product({ name, category, subcategory, image, images, mrp, price, stock, description });
    await product.save();
    res.json({ message: "Product added", product });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET all products
router.get("/", async (req, res) => {
  const filter = {};
  if (req.query.category) filter.category = req.query.category;
  if (req.query.subcategory) filter.subcategory = req.query.subcategory;
  const products = await Product.find(filter).sort({ createdAt: -1 });
  res.json(products);
});


// 🗑 Delete Product (admin only)
router.delete("/:id", protect, isAdmin, async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: "Product deleted" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting product" });
  }
});

// ✏ Update Product (admin only)
router.put("/:id", protect, isAdmin, async (req, res) => {
  try {
    const updated = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ message: "Product updated", updated });
  } catch (err) {
    res.status(500).json({ message: "Error updating product" });
  }
});
// Get single product by ID
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});


// 💬 Submit product review (protected)
router.post("/:id/reviews", protect, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const alreadyReviewed = product.reviews.find(
      (r) => r.user.toString() === req.user._id.toString()
    );

    if (alreadyReviewed) {
      return res.status(400).json({ message: "Product already reviewed" });
    }

    const review = {
      name: req.user.username,
      rating: Number(rating),
      comment,
      user: req.user._id,
    };

    product.reviews.push(review);
    product.numReviews = product.reviews.length;
    product.rating =
      product.reviews.reduce((acc, item) => item.rating + acc, 0) /
      product.reviews.length;

    await product.save();
    res.status(201).json({ message: "Review added", product });
  } catch (err) {
    console.error("Submit review error:", err);
    res.status(500).json({ message: "Failed to submit review" });
  }
});

module.exports = router;
