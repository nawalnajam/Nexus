const express = require('express');
const { body } = require('express-validator');
const {
  scheduleMeeting,
  getMyMeetings,
  getMeeting,
  updateMeetingStatus,
  deleteMeeting,
} = require('../controllers/meetingController');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

const scheduleRules = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('participantId').notEmpty().withMessage('Participant is required'),
  body('startTime').isISO8601().withMessage('Valid start time required'),
  body('endTime').isISO8601().withMessage('Valid end time required'),
];

router.post('/',          scheduleRules, scheduleMeeting);
router.get('/',                          getMyMeetings);
router.get('/:id',                       getMeeting);
router.put('/:id/status',                updateMeetingStatus);
router.delete('/:id',                    deleteMeeting);

module.exports = router;