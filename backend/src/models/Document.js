const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema(
  {
    // File info
    title:       { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    fileName:    { type: String, required: true },
    fileUrl:     { type: String, default: '' },  // Cloudinary URL
    publicId: { type: String, default: '' },  // Cloudinary public_id
    fileType:    { type: String, required: true },  // pdf, docx, etc
    fileSize:    { type: Number, required: true },  // bytes
    mimeType:    { type: String, required: true },

    // Ownership
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    sharedWith: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    // Metadata
    version: { type: Number, default: 1 },
    status: {
      type: String,
      enum: ['draft', 'pending_review', 'approved', 'rejected'],
      default: 'draft',
    },
    category: {
      type: String,
      enum: ['pitch_deck', 'contract', 'financial', 'legal', 'other'],
      default: 'other',
    },

    // E-signature
    signatures: [
      {
        signedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        signatureUrl: { type: String },  // Cloudinary URL of signature image
        signedAt:   { type: Date },
        ipAddress:  { type: String },
      }
    ],

    // Related meeting
    meeting: { type: mongoose.Schema.Types.ObjectId, ref: 'Meeting', default: null },
  },
  { timestamps: true }
);

documentSchema.index({ uploadedBy: 1 });
documentSchema.index({ sharedWith: 1 });

module.exports = mongoose.model('Document', documentSchema);