const mongoose = require("mongoose");

const configSchema = new mongoose.Schema({
  miningRate: { type: Number, default: 0.01 },
  minWithdrawal: { type: Number, default: 10 },
  maxWithdrawal: { type: Number, default: 1000 },
  referralBonus: { type: Number, default: 10 },
  maintenanceMode: { type: Boolean, default: false },
  paymentAddressEVM: String,
  paymentAddressSOL: String,
  premiumFee: { type: Number, default: 10.0 }
}, { timestamps: true });

module.exports = mongoose.model("Config", configSchema);
