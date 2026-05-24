const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const registerRules = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter')
    .matches(/[0-9]/).withMessage('Password must contain a number'),
  body('role').isIn(['entrepreneur', 'investor']).withMessage('Role must be entrepreneur or investor'),
];

const loginRules = [
  body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password required'),
];

// Routes
router.post('/register', registerRules, authController.register);
router.post('/login',    loginRules,    authController.login);
router.post('/refresh',                 authController.refresh);
router.post('/logout',                  authController.logout);
router.get('/me',        protect,       authController.getMe);

module.exports = router;