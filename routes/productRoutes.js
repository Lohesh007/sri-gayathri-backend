const express = require("express");
const router = express.Router();
const Product = require("../models/Product");
const protect = require("../middleware/authMiddleware");
const isAdmin = require("../middleware/isAdmin");

const allowedProductFields = ["name", "category", "subcategory", "image", "images", "mrp", "price", "stock", "description"];
const validateProduct = (data, partial = false) => {
  if (!data || typeof data !== "object" || Array.isArray(data)) return "Invalid product data";
  for (const key of Object.keys(data)) if (!allowedProductFields.includes(key)) return `Unsupported field: ${key}`;
  const required = ["name", "category", "subcategory", "image", "mrp", "price", "stock"];
  if (!partial && required.some((key) => data[key] === undefined || data[key] === null || data[key] === "")) return "Required product fields are missing";
  for (const key of ["name", "category", "subcategory", "image", "description"]) {
    if (data[key] !== undefined && (typeof data[key] !== "string" || data[key].length > (key === "description" ? 5000 : 250))) return `Invalid ${key}`;
  }
  for (const key of ["mrp", "price", "stock"]) {
    if (data[key] !== undefined && (!Number.isFinite(Number(data[key])) || Number(data[key]) < 0 || (key === "stock" && !Number.isInteger(Number(data[key]))))) return `Invalid ${key}`;
  }
  if (data.images !== undefined && (!Array.isArray(data.images) || data.images.length > 10 || data.images.some((url) => typeof url !== "string" || url.length > 2048))) return "Invalid product images";
  if (data.price !== undefined && data.mrp !== undefined && Number(data.price) > Number(data.mrp)) return "Price cannot exceed MRP";
  return null;
};

// Add product (admin only)
router.post("/add", protect, isAdmin, async (req, res) => {
  try {
    const validationError = validateProduct(req.body);
    if (validationError) return res.status(400).json({ message: validationError });
    const product = new Product(req.body);
    await product.save();
    res.status(201).json({ message: "Product added", product });
  } catch (err) {
    res.status(400).json({ message: "Unable to add product" });
  }
});

// GET all products
router.get("/", async (req, res) => {
  try {
    const filter = {};
    if (req.query.category) filter.category = req.query.category;
    if (req.query.subcategory) filter.subcategory = req.query.subcategory;
    const products = await Product.find(filter).sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: "Failed to load products" });
  }
});

// Delete product (admin only)
router.delete("/:id", protect, isAdmin, async (req, res) => {
  try {
    const deleted = await Product.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Product not found" });
    res.json({ message: "Product deleted" });
  } catch (err) {
    res.status(400).json({ message: "Invalid product ID" });
  }
});

// Update product (admin only; allowlisted fields)
router.put("/:id", protect, isAdmin, async (req, res) => {
  try {
    const validationError = validateProduct(req.body, true);
    if (validationError) return res.status(400).json({ message: validationError });
    const updated = await Product.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true, runValidators: true });
    if (!updated) return res.status(404).json({ message: "Product not found" });
    res.json({ message: "Product updated", updated });
  } catch (err) {
    res.status(400).json({ message: "Unable to update product" });
  }
});

// Get single product by ID
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  } catch (error) {
    res.status(400).json({ message: "Invalid product ID" });
  }
});

// Submit product review (protected)
router.post("/:id/reviews", protect, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    if (!Number.isInteger(Number(rating)) || Number(rating) < 1 || Number(rating) > 5 || typeof comment !== "string" || !comment.trim() || comment.trim().length > 1000) {
      return res.status(400).json({ message: "Rating must be 1–5 and comment must be 1–1000 characters" });
    }
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    const alreadyReviewed = product.reviews.find((r) => r.user.toString() === req.user._id.toString());
    if (alreadyReviewed) return res.status(400).json({ message: "Product already reviewed" });
    product.reviews.push({ name: req.user.username, rating: Number(rating), comment: comment.trim(), user: req.user._id });
    product.numReviews = product.reviews.length;
    product.rating = product.reviews.reduce((acc, item) => item.rating + acc, 0) / product.reviews.length;
    await product.save();
    res.status(201).json({ message: "Review added", product });
  } catch (err) {
    res.status(500).json({ message: "Failed to submit review" });
  }
});

module.exports = router;
