const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
require("dotenv").config();
const connectDB = require("./config/db");

connectDB();

const app = express();

// Render forwards traffic through one proxy; needed for secure cookies and rate-limit client IPs.
app.set("trust proxy", 1);

app.use(helmet({
  contentSecurityPolicy: false, // CSP will be enabled after verifying all third-party script/style requirements.
}));
app.use(cookieParser());

const allowedOrigins = new Set([
  "https://sri-gayathri-fancy-religious.netlify.app",
  "https://www.srigayathrireligious.com",
  "https://srigayathrireligious.com",
  "http://localhost:3000",
]);
if (process.env.FRONTEND_URL) {
  try {
    allowedOrigins.add(new URL(process.env.FRONTEND_URL).origin);
  } catch {
    console.warn("FRONTEND_URL is not a valid URL; it will not be added to CORS allowlist.");
  }
}

app.use(cors({
  origin: (origin, callback) => callback(null, !origin || allowedOrigins.has(origin)),
  credentials: true,
}));
app.use(express.json({
  limit: "2mb",
  verify: (req, res, buf) => {
    if (req.originalUrl === "/api/payment/webhook") req.rawBody = Buffer.from(buf);
  },
}));

app.get("/", (req, res) => {
  res.status(200).send("Sri Gayathri API is running 🚀");
});

app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/products", require("./routes/productRoutes"));
app.use("/api/cart", require("./routes/cartRoutes"));
app.use("/api/orders", require("./routes/orderRoutes"));
app.use("/api/categories", require("./routes/categoryRoutes"));
app.use("/api/payment", require("./routes/paymentRoutes"));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
