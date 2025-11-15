const express = require("express");
const router = express.Router();
const categories = require("../config/categories");

// GET all categories
router.get("/", (req, res) => {
  res.json(categories);
});

module.exports = router;
