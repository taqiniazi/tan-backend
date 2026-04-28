const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  txHash: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true
  },
  network: {
    type: String,
    enum: ['BSC', 'ETH', 'SOL'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'verified', 'failed'],
    default: 'pending'
  },
  verifiedAt: {
    type: Date
  }
}, { timestamps: true });

// Ensure compound index for user queries
paymentSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Payment', paymentSchema);
