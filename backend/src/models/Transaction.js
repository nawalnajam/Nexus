const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: ['deposit', 'withdrawal', 'transfer'],
      required: true,
    },
    amount: { type: Number, required: true, min: 1 },
    currency: { type: String, default: 'usd' },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'pending',
    },
    // Stripe
    stripePaymentIntentId: { type: String, default: '' },
    stripeClientSecret:    { type: String, default: '' },
    // Transfer specific
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    // Description
    description: { type: String, default: '' },
    metadata:    { type: Object, default: {} },
  },
  { timestamps: true }
);

transactionSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);