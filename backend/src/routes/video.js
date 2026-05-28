const express = require('express');
const { getRoomAccess } = require('../controllers/videoController');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

router.get('/token/:roomId', getRoomAccess);

module.exports = router;