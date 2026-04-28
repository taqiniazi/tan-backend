const User = require('../models/User');

exports.getReferrals = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const referrals = await User.find({ referredBy: user.referralCode })
      .select('name email createdAt isPremium')
      .sort({ createdAt: -1 });

    res.json({
      referralCode: user.referralCode,
      referralEarnings: user.referralEarnings || 0,
      referralCount: referrals.length,
      referrals: referrals
    });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};
