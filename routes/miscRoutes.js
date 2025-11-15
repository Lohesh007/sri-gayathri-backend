// backend/routes/miscRoutes.js
const express = require("express");
const router = express.Router();
const categories = require("../config/categories");

router.get("/categories", (req, res) => {
  res.json(categories);
});

module.exports = router;
