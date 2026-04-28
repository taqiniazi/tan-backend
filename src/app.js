require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const { apiLimiter } = require("./middlewares/rateLimiter");
const logger = require("./utils/logger");
const bcrypt = require("bcryptjs");
const User = require("./models/User");

const app = express();

// --- Production Middlewares ---
app.use(helmet()); // Security headers
app.use(morgan("combined", { stream: { write: (message) => logger.info(message.trim()) } })); // HTTP logging
app.use(express.json());
app.use("/uploads", express.static("uploads"));
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(",") : "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));
app.use(apiLimiter);

// Database Connection
if (!process.env.MONGO_URI) {
  logger.error("CRITICAL ERROR: MONGO_URI is not defined in environment variables!");
}
mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    logger.info("MongoDB Connected");
    // Seed default admin if it doesn't exist
    if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
      const adminExists = await User.findOne({ email: process.env.ADMIN_EMAIL });
      if (!adminExists) {
        const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
        await User.create({
          name: "Super Admin",
          email: process.env.ADMIN_EMAIL,
          password: hashedPassword,
          role: "admin",
          referralCode: "SUPERADMIN"
        });
        logger.info("Default admin user created");
      }
    }
  })
  .catch(err => logger.error("MongoDB Connection Error: %o", err));

// Routes
app.use("/api", require("./routes"));
app.use("/tan_network/api", require("./routes"));

// Error Handling Middleware
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

module.exports = app;