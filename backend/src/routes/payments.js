const express = require('express');
const { body } = require('express-validator');
const {
  createDeposit,
  confirmDeposit,
  createWithdrawal,
  createTransfer,
  getTransactionHistory,
} = require('../controllers/paymentController');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

const amountRules = [
  body('amount').isFloat({ min: 1 }).withMessage('Amount must be at least $1'),
];

router.post('/deposit',         amountRules, createDeposit);
router.post('/deposit/confirm',              confirmDeposit);
router.post('/withdraw',        amountRules, createWithdrawal);
router.post('/transfer',        amountRules, createTransfer);
router.get('/history',                       getTransactionHistory);

module.exports = router;