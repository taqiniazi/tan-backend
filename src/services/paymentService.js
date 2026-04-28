const { ethers } = require('ethers');
const { Connection, PublicKey } = require('@solana/web3.js');
const logger = require('../utils/logger');

class PaymentService {
  constructor() {
    // These should be in .env
    this.ethProvider = process.env.ETH_RPC_URL ? new ethers.JsonRpcProvider(process.env.ETH_RPC_URL) : null;
    this.bscProvider = process.env.BSC_RPC_URL ? new ethers.JsonRpcProvider(process.env.BSC_RPC_URL) : null;
    this.solConnection = process.env.SOL_RPC_URL ? new Connection(process.env.SOL_RPC_URL) : null;
  }

  async verifyEthTransaction(txHash, expectedAmount, expectedRecipient) {
    try {
      if (!this.ethProvider) throw new Error('ETH Provider not configured');
      const tx = await this.ethProvider.getTransaction(txHash);
      if (!tx) return { success: false, message: 'Transaction not found' };

      const receipt = await tx.wait();
      if (receipt.status !== 1) return { success: false, message: 'Transaction failed on-chain' };

      const amount = ethers.formatEther(tx.value);
      const isCorrectRecipient = tx.to.toLowerCase() === expectedRecipient.toLowerCase();
      const isCorrectAmount = parseFloat(amount) >= parseFloat(expectedAmount);

      return {
        success: isCorrectRecipient && isCorrectAmount,
        amount,
        from: tx.from,
        to: tx.to
      };
    } catch (error) {
      logger.error('ETH Verification Error: %o', error);
      return { success: false, error: error.message };
    }
  }

  async verifyBscTransaction(txHash, expectedAmount, expectedRecipient) {
    try {
      if (!this.bscProvider) throw new Error('BSC Provider not configured');
      const tx = await this.bscProvider.getTransaction(txHash);
      if (!tx) return { success: false, message: 'Transaction not found' };

      const receipt = await tx.wait();
      if (receipt.status !== 1) return { success: false, message: 'Transaction failed on-chain' };

      const amount = ethers.formatEther(tx.value);
      const isCorrectRecipient = tx.to.toLowerCase() === expectedRecipient.toLowerCase();
      const isCorrectAmount = parseFloat(amount) >= parseFloat(expectedAmount);

      return {
        success: isCorrectRecipient && isCorrectAmount,
        amount,
        from: tx.from,
        to: tx.to
      };
    } catch (error) {
      logger.error('BSC Verification Error: %o', error);
      return { success: false, error: error.message };
    }
  }

  async verifySolTransaction(signature, expectedAmount, expectedRecipient) {
    try {
      if (!this.solConnection) throw new Error('SOL Connection not configured');
      const tx = await this.solConnection.getTransaction(signature, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0
      });

      if (!tx) return { success: false, message: 'Transaction not found' };

      // Simplified SOL verification (checking instructions for transfer)
      // Note: A real implementation would need to parse instructions more carefully for SPL tokens
      const accountKeys = tx.transaction.message.staticAccountKeys || tx.transaction.message.accountKeys;
      const postBalances = tx.meta.postBalances;
      const preBalances = tx.meta.preBalances;
      
      // Index of recipient
      const recipientIndex = accountKeys.findIndex(key => key.toBase58() === expectedRecipient);
      if (recipientIndex === -1) return { success: false, message: 'Recipient not found in transaction' };

      const receivedLamports = postBalances[recipientIndex] - preBalances[recipientIndex];
      const receivedSol = receivedLamports / 1e9;

      const isCorrectAmount = receivedSol >= parseFloat(expectedAmount);

      return {
        success: isCorrectAmount,
        amount: receivedSol,
        recipient: expectedRecipient
      };
    } catch (error) {
      logger.error('SOL Verification Error: %o', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new PaymentService();
