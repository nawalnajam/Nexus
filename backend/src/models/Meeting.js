const mongoose = require('mongoose');

const meetingSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },

    // Who scheduled and who is invited
    organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    participant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // Timing
    startTime: { type: Date, required: true },
    endTime:   { type: Date, required: true },
    duration:  { type: Number, default: 30 }, // minutes

    // Status
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'cancelled', 'completed'],
      default: 'pending',
    },

    // Meeting type
    type: {
      type: String,
      enum: ['video', 'audio', 'in-person'],
      default: 'video',
    },

    // Video call room (for WebRTC - Week 2 Milestone 4)
    roomId: { type: String, default: '' },

    // Notes
    organizerNotes:   { type: String, default: '' },
    participantNotes: { type: String, default: '' },

    // Rejection reason
    rejectionReason: { type: String, default: '' },
  },
  { timestamps: true }
);

// Index for conflict detection
meetingSchema.index({ organizer: 1, startTime: 1 });
meetingSchema.index({ participant: 1, startTime: 1 });

module.exports = mongoose.model('Meeting', meetingSchema);