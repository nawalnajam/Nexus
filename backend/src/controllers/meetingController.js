const Meeting = require('../models/Meeting');
const User = require('../models/User');
const { v4: uuidv4 } = require('uuid');

// ─── Conflict Detection Helper ─────────────────────────────────────────────
const hasConflict = async (userId, startTime, endTime, excludeId = null) => {
  const query = {
    $or: [{ organizer: userId }, { participant: userId }],
    status: { $in: ['pending', 'accepted'] },
    $or: [
      { startTime: { $lt: endTime }, endTime: { $gt: startTime } }
    ],
  };
  if (excludeId) query._id = { $ne: excludeId };
  const conflict = await Meeting.findOne(query);
  return !!conflict;
};

// ─── POST /api/meetings ────────────────────────────────────────────────────
exports.scheduleMeeting = async (req, res, next) => {
  try {
    const { title, description, participantId, startTime, endTime, duration, type, organizerNotes } = req.body;

    // Validate times
    const start = new Date(startTime);
    const end   = new Date(endTime);
    if (start >= end)
      return res.status(400).json({ success: false, message: 'End time must be after start time' });
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
if (start < fiveMinutesAgo)
  return res.status(400).json({ success: false, message: 'Meeting cannot be in the past' });

    // Check participant exists
    const participant = await User.findById(participantId);
    if (!participant)
      return res.status(404).json({ success: false, message: 'Participant not found' });

    // Conflict detection for organizer
    const organizerConflict = await hasConflict(req.user._id, start, end);
    if (organizerConflict)
      return res.status(409).json({ success: false, message: 'You have a conflicting meeting at this time' });

    // Conflict detection for participant
    const participantConflict = await hasConflict(participantId, start, end);
    if (participantConflict)
      return res.status(409).json({ success: false, message: 'Participant has a conflicting meeting at this time' });

    // Create meeting with unique room ID
    const meeting = await Meeting.create({
      title,
      description,
      organizer:      req.user._id,
      participant:    participantId,
      startTime:      start,
      endTime:        end,
      duration:       duration || 30,
      type:           type || 'video',
      organizerNotes: organizerNotes || '',
      roomId:         uuidv4(),
    });

    await meeting.populate(['organizer', 'participant'], 'name email avatar role');

    res.status(201).json({ success: true, meeting });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/meetings ─────────────────────────────────────────────────────
exports.getMyMeetings = async (req, res, next) => {
  try {
    const { status, upcoming } = req.query;
    const userId = req.user._id;

    const query = {
      $or: [{ organizer: userId }, { participant: userId }],
    };

    if (status) query.status = status;
    if (upcoming === 'true') query.startTime = { $gte: new Date() };

    const meetings = await Meeting.find(query)
      .populate('organizer participant', 'name email avatar role')
      .sort({ startTime: 1 });

    res.json({ success: true, total: meetings.length, meetings });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/meetings/:id ─────────────────────────────────────────────────
exports.getMeeting = async (req, res, next) => {
  try {
    const meeting = await Meeting.findById(req.params.id)
      .populate('organizer participant', 'name email avatar role');

    if (!meeting)
      return res.status(404).json({ success: false, message: 'Meeting not found' });

    // Only organizer or participant can view
    const isInvolved =
      String(meeting.organizer._id) === String(req.user._id) ||
      String(meeting.participant._id) === String(req.user._id);

    if (!isInvolved)
      return res.status(403).json({ success: false, message: 'Access denied' });

    res.json({ success: true, meeting });
  } catch (err) {
    next(err);
  }
};

// ─── PUT /api/meetings/:id/status ──────────────────────────────────────────
exports.updateMeetingStatus = async (req, res, next) => {
  try {
    const { status, rejectionReason, participantNotes } = req.body;
    const meeting = await Meeting.findById(req.params.id);

    if (!meeting)
      return res.status(404).json({ success: false, message: 'Meeting not found' });

    const isParticipant = String(meeting.participant) === String(req.user._id);
    const isOrganizer   = String(meeting.organizer)   === String(req.user._id);

    // Only participant can accept/reject
    if (['accepted', 'rejected'].includes(status) && !isParticipant)
      return res.status(403).json({ success: false, message: 'Only participant can accept or reject' });

    // Only organizer can cancel
    if (status === 'cancelled' && !isOrganizer)
      return res.status(403).json({ success: false, message: 'Only organizer can cancel' });

    meeting.status = status;
    if (rejectionReason) meeting.rejectionReason = rejectionReason;
    if (participantNotes) meeting.participantNotes = participantNotes;

    await meeting.save();
    await meeting.populate('organizer participant', 'name email avatar role');

    res.json({ success: true, meeting });
  } catch (err) {
    next(err);
  }
};

// ─── DELETE /api/meetings/:id ──────────────────────────────────────────────
exports.deleteMeeting = async (req, res, next) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting)
      return res.status(404).json({ success: false, message: 'Meeting not found' });

    const isOrganizer = String(meeting.organizer) === String(req.user._id);
    if (!isOrganizer)
      return res.status(403).json({ success: false, message: 'Only organizer can delete meeting' });

    await meeting.deleteOne();
    res.json({ success: true, message: 'Meeting deleted' });
  } catch (err) {
    next(err);
  }
};