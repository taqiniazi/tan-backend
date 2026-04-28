const Payment = require('../models/Payment');
const User = require('../models/User');
const blockchainService = require('../services/blockchainService');
const logger = require('../utils/logger');

exports.verifyPayment = async (req, res) => {
  try {
    const { txHash, network } = req.body;
    const userId = req.user.id;

    // 1. Check if transaction hash has already been processed
    const existingPayment = await Payment.findOne({ txHash });
    if (existingPayment) {
      return res.status(400).json({ error: "This transaction has already been processed." });
    }

    // 2. Call blockchain service to verify transaction on-chain
    let verificationResult;
    switch (network) {
      case 'BSC':
        verificationResult = await blockchainService.verifyBSC(txHash);
        break;
      case 'ETH':
        verificationResult = await blockchainService.verifyETH(txHash);
        break;
      case 'SOL':
        verificationResult = await blockchainService.verifySOL(txHash);
        break;
      default:
        return res.status(400).json({ error: "Unsupported network." });
    }

    if (!verificationResult.success) {
      return res.status(400).json({ 
        error: "Blockchain verification failed.", 
        message: verificationResult.message 
      });
    }

    // 3. Verify Recipient Address
    const expectedAddress = network === 'SOL' ? process.env.PAYMENT_ADDRESS_SOL : process.env.PAYMENT_ADDRESS_EVM;
    
    if (verificationResult.toAddress.toLowerCase() !== expectedAddress.toLowerCase()) {
      logger.warn(`Payment failed: Wrong recipient. Got ${verificationResult.toAddress}, expected ${expectedAddress}`);
      return res.status(400).json({ 
        error: "Invalid recipient address.", 
        message: "The payment was not sent to the official project wallet." 
      });
    }

    // 4. Validate Amount
    const isAmountValid = verificationResult.amount > 0;
    if (!isAmountValid) {
      return res.status(400).json({ error: "Insufficient payment amount detected." });
    }

    // 4. Record the payment in DB
    const payment = await Payment.create({
      userId,
      txHash,
      network,
      amount: verificationResult.amount,
      status: 'verified',
      verifiedAt: new Date()
    });

    // 5. Upgrade User to Premium
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

    await User.findByIdAndUpdate(userId, {
      $set: {
        isPremium: true,
        miningRate: 0.1, // Upgraded rate
        premiumExpiry: oneYearFromNow
      }
    });

    logger.info(`User ${userId} upgraded to Premium via ${network} transaction ${txHash}`);

    res.json({
      success: true,
      message: "Payment verified. You are now a Premium member!",
      details: {
        amount: verificationResult.amount,
        expiry: oneYearFromNow
      }
    });

  } catch (error) {
    logger.error('Error in verifyPayment: %o', error);
    res.status(500).json({ error: "Internal server error during payment verification." });
  }
};

exports.getPaymentHistory = async (req, res) => {
  try {
    const payments = await Payment.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(payments);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};
