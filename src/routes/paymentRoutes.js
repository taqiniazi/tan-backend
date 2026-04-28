const express = require('express');
const router = express.Router();
const paymentService = require('../services/paymentService');
const validate = require('../middlewares/validate');
const { z } = require('zod');
const auth = require('../middleware/auth');
const logger = require('../utils/logger');

const verifyTxSchema = z.object({
  body: z.object({
    network: z.enum(['ETH', 'BSC', 'SOL']),
    txHash: z.string(),
    amount: z.string(),
    recipient: z.string(),
  }),
});

router.post('/verify', auth, validate(verifyTxSchema), async (req, res) => {
  const { network, txHash, amount, recipient } = req.body;
  let result;

  try {
    switch (network) {
      case 'ETH':
        result = await paymentService.verifyEthTransaction(txHash, amount, recipient);
        break;
      case 'BSC':
        result = await paymentService.verifyBscTransaction(txHash, amount, recipient);
        break;
      case 'SOL':
        result = await paymentService.verifySolTransaction(txHash, amount, recipient);
        break;
    }

    if (result.success) {
      logger.info(`Payment verified for user ${req.user.id}: ${network} ${txHash}`);
      return res.json({ status: 'success', data: result });
    } else {
      logger.warn(`Payment verification failed: ${result.message || result.error}`);
      return res.status(400).json({ status: 'failed', message: result.message || result.error });
    }
  } catch (error) {
    logger.error(`Error in payment verification: ${error.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
