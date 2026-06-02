const Stripe = require('stripe');
const Transaction = require('../models/Transaction');
const User = require('../models/User');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// ─── POST /api/payments/deposit ────────────────────────────────────────────
exports.createDeposit = async (req, res, next) => {
  try {
    const { amount, currency = 'usd', description } = req.body;

    if (!amount || amount < 1)
      return res.status(400).json({ success: false, message: 'Minimum amount is $1' });

    // Create and auto-confirm Stripe PaymentIntent with test card
    const paymentIntent = await stripe.paymentIntents.create({
      amount:         Math.round(amount * 100),
      currency,
      confirm:        true,
      payment_method: 'pm_card_visa',
      return_url:     'http://localhost:5173/payments',
      metadata:       { userId: String(req.user._id) },
    });

    const transaction = await Transaction.create({
      user:                  req.user._id,
      type:                  'deposit',
      amount,
      currency,
      status:                paymentIntent.status === 'succeeded' ? 'completed' : 'pending',
      stripePaymentIntentId: paymentIntent.id,
      stripeClientSecret:    paymentIntent.client_secret,
      description:           description || 'Deposit',
    });

    res.status(201).json({ success: true, transaction });
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/payments/deposit/confirm ───────────────────────────────────
exports.confirmDeposit = async (req, res, next) => {
  try {
    const { paymentIntentId } = req.body;

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    const status = paymentIntent.status === 'succeeded' ? 'completed' : 'failed';

    const transaction = await Transaction.findOneAndUpdate(
      { stripePaymentIntentId: paymentIntentId },
      { status },
      { new: true }
    );

    res.json({ success: true, transaction });
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/payments/withdraw ───────────────────────────────────────────
exports.createWithdrawal = async (req, res, next) => {
  try {
    const { amount, currency = 'usd', description } = req.body;

    if (!amount || amount < 1)
      return res.status(400).json({ success: false, message: 'Minimum amount is $1' });

    const transaction = await Transaction.create({
      user:        req.user._id,
      type:        'withdrawal',
      amount,
      currency,
      status:      'completed',
      description: description || 'Withdrawal',
    });

    res.status(201).json({ success: true, transaction });
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/payments/transfer ───────────────────────────────────────────
exports.createTransfer = async (req, res, next) => {
  try {
    const { amount, recipientId, description, currency = 'usd' } = req.body;

    if (!amount || amount < 1)
      return res.status(400).json({ success: false, message: 'Minimum amount is $1' });

    const recipient = await User.findById(recipientId);
    if (!recipient)
      return res.status(404).json({ success: false, message: 'Recipient not found' });

    if (String(recipientId) === String(req.user._id))
      return res.status(400).json({ success: false, message: 'Cannot transfer to yourself' });

    const transaction = await Transaction.create({
      user:        req.user._id,
      type:        'transfer',
      amount,
      currency,
      status:      'completed',
      recipient:   recipientId,
      description: description || `Transfer to ${recipient.name}`,
    });

    await transaction.populate('user recipient', 'name email avatar');

    res.status(201).json({ success: true, transaction });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/payments/history ─────────────────────────────────────────────
exports.getTransactionHistory = async (req, res, next) => {
  try {
    const { type, status, page = 1, limit = 10 } = req.query;
    const userId = req.user._id;

    const query = {
      $or: [{ user: userId }, { recipient: userId }],
    };
    if (type)   query.type   = type;
    if (status) query.status = status;

    const total        = await Transaction.countDocuments(query);
    const transactions = await Transaction.find(query)
      .populate('user recipient', 'name email avatar')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    // Calculate balance
    const completed = await Transaction.find({
      $or: [{ user: userId }, { recipient: userId }],
      status: 'completed',
    });

    let balance = 0;
    completed.forEach(t => {
      if (String(t.user._id || t.user) === String(userId)) {
        if (t.type === 'deposit')    balance += t.amount;
        if (t.type === 'withdrawal') balance -= t.amount;
        if (t.type === 'transfer')   balance -= t.amount;
      }
      if (String(t.recipient) === String(userId)) {
        if (t.type === 'transfer') balance += t.amount;
      }
    });

    res.json({
      success: true,
      balance,
      total,
      page:  Number(page),
      pages: Math.ceil(total / limit),
      transactions,
    });
  } catch (err) {
    next(err);
  }
};