exports.getConfig = async (req, res) => {
  res.json({
    paymentAddressEVM: process.env.PAYMENT_ADDRESS_EVM,
    paymentAddressSOL: process.env.PAYMENT_ADDRESS_SOL,
    premiumFee: 5.0, // Hardcoded fee for now
  });
};
