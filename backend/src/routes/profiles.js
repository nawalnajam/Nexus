const express = require('express');
const { body } = require('express-validator');
const {
  getMyProfile,
  updateMyProfile,
  getProfileById,
  listProfiles,
  connectWithUser,
} = require('../controllers/profileController');
const { protect, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/me', getMyProfile);
router.put('/me', [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('bio').optional().isLength({ max: 500 }).withMessage('Bio max 500 characters'),
], updateMyProfile);

router.get('/', listProfiles);
router.get('/:id', getProfileById);
router.post('/:id/connect', connectWithUser);

router.get('/dashboard/investor', authorizeRoles('investor'), (req, res) =>
  res.json({ success: true, message: 'Investor dashboard', user: req.user.toPublicJSON() })
);

router.get('/dashboard/entrepreneur', authorizeRoles('entrepreneur'), (req, res) =>
  res.json({ success: true, message: 'Entrepreneur dashboard', user: req.user.toPublicJSON() })
);

module.exports = router;