const mongoose = require("mongoose");

const configSchema = new mongoose.Schema({
  miningRate: { type: Number, default: 0.01 },
  minWithdrawal: { type: Number, default: 10 },
  maxWithdrawal: { type: Number, default: 1000 },
  referralBonus: { type: Number, default: 10 },
  maintenanceMode: { type: Boolean, default: false },
  paymentAddressEVM: String,
  paymentAddressSOL: String,
  premiumFee: { type: Number, default: 10.0 },
  minAppVersion: { type: String, default: "1.0.0" },
  appUpdateUrl: { type: String, default: "https://tannetwork.online" }
}, { timestamps: true });

module.exports = mongoose.model("Config", configSchema);
