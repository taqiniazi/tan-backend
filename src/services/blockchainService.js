const axios = require('axios');
const { Connection, PublicKey } = require('@solana/web3.js');
const logger = require('../utils/logger');

class BlockchainService {
  constructor() {
    this.bscScanApiKey = process.env.BSC_API_KEY;
    this.etherscanApiKey = process.env.ETH_API_KEY;
    
    // Solana Connection
    const solRpcUrl = process.env.SOL_RPC_URL || 'https://api.mainnet-beta.solana.com';
    this.solConnection = new Connection(solRpcUrl, 'confirmed');
  }

  async verifyBSC(txHash) {
    try {
      const url = `https://api.bscscan.com/api?module=proxy&action=eth_getTransactionReceipt&txhash=${txHash}&apikey=${this.bscScanApiKey}`;
      const response = await axios.get(url);
      
      const receipt = response.data.result;
      if (!receipt) return { success: false, message: 'Transaction not found' };

      // status: "0x1" is success
      if (receipt.status !== '0x1') return { success: false, message: 'Transaction failed on chain' };

      // Get transaction details for amount and receiver
      const txDetailsUrl = `https://api.bscscan.com/api?module=proxy&action=eth_getTransactionByHash&txhash=${txHash}&apikey=${this.bscScanApiKey}`;
      const txResponse = await axios.get(txDetailsUrl);
      const tx = txResponse.data.result;

      return {
        success: true,
        amount: parseInt(tx.value, 16) / 1e18, // Convert from Wei
        toAddress: tx.to,
        fromAddress: tx.from
      };
    } catch (error) {
      logger.error('BSC Verification Error: %o', error);
      return { success: false, error: error.message };
    }
  }

  async verifyETH(txHash) {
    try {
      const url = `https://api.etherscan.io/api?module=proxy&action=eth_getTransactionReceipt&txhash=${txHash}&apikey=${this.etherscanApiKey}`;
      const response = await axios.get(url);
      
      const receipt = response.data.result;
      if (!receipt) return { success: false, message: 'Transaction not found' };

      if (receipt.status !== '0x1') return { success: false, message: 'Transaction failed on chain' };

      const txDetailsUrl = `https://api.etherscan.io/api?module=proxy&action=eth_getTransactionByHash&txhash=${txHash}&apikey=${this.etherscanApiKey}`;
      const txResponse = await axios.get(txDetailsUrl);
      const tx = txResponse.data.result;

      return {
        success: true,
        amount: parseInt(tx.value, 16) / 1e18,
        toAddress: tx.to,
        fromAddress: tx.from
      };
    } catch (error) {
      logger.error('ETH Verification Error: %o', error);
      return { success: false, error: error.message };
    }
  }

  async verifySOL(signature) {
    try {
      const tx = await this.solConnection.getTransaction(signature, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0
      });

      if (!tx) return { success: false, message: 'Transaction not found' };
      if (tx.meta && tx.meta.err) return { success: false, message: 'Transaction failed on chain' };

      const accountKeys = tx.transaction.message.staticAccountKeys || tx.transaction.message.accountKeys;
      const preBalances = tx.meta.preBalances;
      const postBalances = tx.meta.postBalances;

      // This is a simplified logic for finding the primary recipient in a SOL transfer
      // It looks for the account that gained the most balance (excluding the sender)
      let maxGain = 0;
      let recipientIndex = -1;

      for (let i = 0; i < postBalances.length; i++) {
        const gain = postBalances[i] - preBalances[i];
        if (gain > maxGain) {
          maxGain = gain;
          recipientIndex = i;
        }
      }

      if (recipientIndex === -1) return { success: false, message: 'No recipient found' };

      return {
        success: true,
        amount: maxGain / 1e9, // Convert Lamports to SOL
        toAddress: accountKeys[recipientIndex].toBase58()
      };
    } catch (error) {
      logger.error('SOL Verification Error: %o', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new BlockchainService();
