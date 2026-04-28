const User = require("../models/User");
const bcrypt = require("bcryptjs");
const path = require("path");

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch profile" });
  }
};

exports.updatePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id);
    
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) return res.status(400).send("Incorrect old password");

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    
    res.send("Password updated successfully");
  } catch (error) {
    res.status(500).send("Failed to update password");
  }
};

exports.updateProfileImage = async (req, res) => {
  try {
    if (!req.file) return res.status(400).send("No image uploaded");

    const user = await User.findById(req.user.id);
    user.profileImage = `/uploads/profiles/${req.file.filename}`;
    await user.save();

    res.json({ imageUrl: user.profileImage });
  } catch (error) {
    res.status(500).send("Failed to upload image");
  }
};
