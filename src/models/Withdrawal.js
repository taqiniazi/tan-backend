// src/models/Withdrawal.js
const mongoose = require("mongoose");

const withdrawalSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  amount: Number,
  walletAddress: String,
  network: String,

  status: { type: String, default: "pending" },
  txHash: String,

  createdAt: { type: Date, default: Date.now },
  processedAt: Date
});

module.exports = mongoose.model("Withdrawal", withdrawalSchema);