const { Worker } = require('bullmq');
const { ethers } = require('ethers');
const { Connection, Keypair, Transaction, SystemProgram, LAMPORTS_PER_SOL, sendAndConfirmTransaction, PublicKey } = require('@solana/web3.js');
const bs58 = require('bs58');
const redisConnection = require('../config/redis');
const Withdrawal = require('../models/Withdrawal');
const logger = require('../utils/logger');

const payoutWorker = new Worker('payoutQueue', async job => {
  const { withdrawalId } = job.data;
  const w = await Withdrawal.findById(withdrawalId);
  
  if (!w || w.status !== 'approved') {
    logger.warn(`Withdrawal ${withdrawalId} not eligible for payout.`);
    return;
  }

  try {
    let txHash;

    if (w.network === 'BSC' || w.network === 'ETH') {
      const rpcUrl = w.network === 'BSC' ? process.env.BSC_RPC_URL : process.env.ETH_RPC_URL;
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const wallet = new ethers.Wallet(process.env.PAYOUT_PRIVATE_KEY, provider);

      const tx = await wallet.sendTransaction({
        to: w.walletAddress,
        value: ethers.parseEther(w.amount.toString())
      });
      
      txHash = tx.hash;
      await tx.wait();

    } else if (w.network === 'SOL') {
      const connection = new Connection(process.env.SOL_RPC_URL, 'confirmed');
      const fromWallet = Keypair.fromSecretKey(bs58.decode(process.env.PAYOUT_PRIVATE_KEY_SOL || process.env.PAYOUT_PRIVATE_KEY));

      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: fromWallet.publicKey,
          toPubkey: new PublicKey(w.walletAddress),
          lamports: w.amount * LAMPORTS_PER_SOL,
        })
      );

      txHash = await sendAndConfirmTransaction(connection, transaction, [fromWallet]);
    }

    w.status = 'completed';
    w.txHash = txHash;
    w.processedAt = new Date();
    await w.save();

    logger.info(`Payout successful: ${w.network} ${txHash} for withdrawal ${w._id}`);

  } catch (error) {
    logger.error(`Payout failed for withdrawal ${w._id}: ${error.message}`);
    throw error; // Trigger BullMQ retry
  }
}, {
  connection: redisConnection,
  concurrency: 1 // Sequential payouts to avoid nonce issues
});

module.exports = payoutWorker;
