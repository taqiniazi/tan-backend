require("dotenv").config();
const express = require("express");
const path = require("path");
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
// Serve API routes under both prefixes for compatibility
const routes = require("./routes");
app.use("/api", routes);
app.use("/tan_network/api", routes);

// Admin Dashboard static files
const adminDistPath = path.resolve(__dirname, "../../tan-admin/dist");

// Serve static files from the admin dist directory
app.use("/tan_network/admin", express.static(adminDistPath));

// Handle React Router deep links for the admin panel
// This ensures that navigating to /tan-backend/admin/login or other sub-routes directly works
app.get("/tan_network/admin*", (req, res) => {
  res.sendFile(path.join(adminDistPath, "index.html"), (err) => {
    if (err) {
      logger.error("Error sending index.html for admin: %o", err);
      res.status(404).send("Admin Panel build not found. Please ensure tan-admin/dist exists.");
    }
  });
});

// Error Handling Middleware
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

module.exports = app;