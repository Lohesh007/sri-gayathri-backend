const express = require("express");
const router = express.Router();
const Product = require("../models/Product");
const protect = require("../middleware/authMiddleware");

// ➕ Add Product
router.post("/add", protect, async (req, res) => {
  try {
    // optionally check admin privileges inside protect
    const { name, category, subcategory, image, mrp, price, description } = req.body;
    const product = new Product({ name, category, subcategory, image, mrp, price, description });
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


// 🗑 Delete Product
router.delete("/:id", protect, async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: "Product deleted" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting product" });
  }
});

// ✏ Update Product
router.put("/:id", protect, async (req, res) => {
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


module.exports = router;
