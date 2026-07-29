const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
require("dotenv").config();
const connectDB = require("./config/db");

connectDB();

const app = express();

app.enable("trust proxy"); // Trust proxy for HTTPS cookies from Render/Heroku proxy load balancers

app.use(helmet({
  contentSecurityPolicy: false, // Keep disabled to allow Razorpay and Cloudinary asset load scripts
}));

app.use(cookieParser());

const allowedOrigins = [
  "https://sri-gayathri-fancy-religious.netlify.app",
  "https://sri-gayathri-fancy-religious.netlify.app/",
  "http://localhost:3000",
  "http://localhost:3000/"
];

if (process.env.FRONTEND_URL) {
  const cleanUrl = process.env.FRONTEND_URL.replace(/\/$/, "");
  allowedOrigins.push(cleanUrl);
  allowedOrigins.push(cleanUrl + "/");
}

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("CORS validation failed for origin: " + origin));
      }
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));

app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/products", require("./routes/productRoutes"));
app.use("/api/cart", require("./routes/cartRoutes"));
app.use("/api/orders", require("./routes/orderRoutes"));
app.use("/api/categories", require("./routes/categoryRoutes"));
app.use("/api/payment", require("./routes/paymentRoutes"));


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
