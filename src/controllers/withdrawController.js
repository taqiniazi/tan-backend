// src/controllers/withdrawController.js
const Withdrawal = require("../models/Withdrawal");
const User = require("../models/User");

exports.request = async (req, res) => {
  const { amount, walletAddress, network } = req.body;

  const user = await User.findById(req.user.id);
  
  if (user.isFlagged) {
    return res.status(403).json({ error: "Your account has been flagged for suspicious activity. Withdrawals restricted." });
  }

  if (user.balance < amount) {
    return res.status(400).send("Insufficient balance");
  }

  if (amount < 50) {
    return res.status(400).send("Minimum is 50 TAN");
  }

  user.balance -= amount;
  await user.save();

  await Withdrawal.create({
    userId: user._id,
    amount,
    walletAddress,
    network
  });

  res.send("Withdrawal requested");
};

exports.myWithdrawals = async (req, res) => {
  const list = await Withdrawal.find({ userId: req.user.id });
  res.send(list);
};