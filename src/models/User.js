// src/models/User.js
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  country: String,
  city: String,
  profileImage: String,

  balance: { type: Number, default: 0 },
  baseBalance: { type: Number, default: 0 },

  miningRate: { type: Number, default: 0.01 },
  lastMiningStartTime: Date,
  isMiningActive: { type: Boolean, default: false },

  isPremium: { type: Boolean, default: false },
  premiumExpiry: Date,

  referralCode: String,
  referredBy: String,
  referralEarnings: { type: Number, default: 0 },
  totalEarnedFromMining: { type: Number, default: 0 },

  role: { type: String, default: "user" },

  fcmToken: String,
  ipAddress: String,
  deviceId: String,
  isFlagged: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);