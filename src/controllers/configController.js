const Config = require("../models/Config");

exports.getConfig = async (req, res) => {
  try {
    let config = await Config.findOne();
    if (!config) {
      // Create default if not exists
      config = await Config.create({
        paymentAddressEVM: process.env.PAYMENT_ADDRESS_EVM,
        paymentAddressSOL: process.env.PAYMENT_ADDRESS_SOL,
      });
    }
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: "Could not fetch config" });
  }
};

exports.updateConfig = async (req, res) => {
  try {
    let config = await Config.findOne();
    if (!config) {
      config = new Config(req.body);
    } else {
      Object.assign(config, req.body);
    }
    await config.save();
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: "Could not update config" });
  }
};

