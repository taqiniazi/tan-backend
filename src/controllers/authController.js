// src/controllers/authController.js
const User = require("../models/User");
const antiCheatService = require("../services/antiCheatService");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");

exports.signup = async (req, res) => {
  const { name, email, password, referralCode, referredBy, deviceId, country, city } = req.body;
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  const hashed = await bcrypt.hash(password, 10);

  const user = await User.create({
    name,
    email,
    password: hashed,
    country,
    city,
    referralCode: uuidv4().slice(0, 6),
    referredBy: referredBy || referralCode || "SUPERADMIN",
    deviceId,
    ipAddress: ip
  });

  // Background anti-cheat check
  antiCheatService.detectMultiAccounts(user).catch(err => console.error(err));

  const token = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '48h' }
  );

  res.send({ 
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      referralCode: user.referralCode,
      miningRate: user.miningRate,
      isPremium: user.isPremium,
      country: user.country,
      city: user.city,
      profileImage: user.profileImage
    }
  });
};

exports.login = async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) return res.status(400).json({ error: "User not found" });

  const valid = await bcrypt.compare(req.body.password, user.password);
  if (!valid) return res.status(400).json({ error: "Invalid password" });

  // Update IP and Device ID on login
  user.ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  if (req.body.deviceId) {
    user.deviceId = req.body.deviceId;
  }
  await user.save();

  // Background anti-cheat check
  antiCheatService.detectMultiAccounts(user).catch(err => console.error(err));

  const token = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '48h' }
  );

  res.send({ 
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      referralCode: user.referralCode,
      miningRate: user.miningRate,
      isPremium: user.isPremium,
      country: user.country,
      city: user.city,
      profileImage: user.profileImage
    }
  });
};

exports.getReferralStats = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    const totalReferrals = await User.countDocuments({ referredBy: user.referralCode });

    res.json({
      referralCode: user.referralCode,
      totalReferrals,
      earnings: user.referralEarnings
    });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};