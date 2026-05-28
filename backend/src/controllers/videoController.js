const Meeting = require('../models/Meeting');

// ─── GET /api/video/token/:roomId ──────────────────────────────────────────
exports.getRoomAccess = async (req, res, next) => {
  try {
    const { roomId } = req.params;

    // Find meeting with this roomId
    const meeting = await Meeting.findOne({ roomId })
      .populate('organizer participant', 'name email avatar role');

    if (!meeting)
      return res.status(404).json({ success: false, message: 'Room not found' });

    // Only organizer or participant can join
    const isInvolved =
      String(meeting.organizer._id) === String(req.user._id) ||
      String(meeting.participant._id) === String(req.user._id);

    if (!isInvolved)
      return res.status(403).json({ success: false, message: 'Access denied' });

    if (meeting.status !== 'accepted')
      return res.status(400).json({ success: false, message: 'Meeting not accepted yet' });

    res.json({
      success: true,
      roomId,
      meeting,
      user: {
        id:     req.user._id,
        name:   req.user.name,
        avatar: req.user.avatar,
      },
    });
  } catch (err) {
    next(err);
  }
};