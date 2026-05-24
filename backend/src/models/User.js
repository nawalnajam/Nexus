const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// ── Shared sub-schemas ─────────────────────────────────────────────────────
const socialLinksSchema = new mongoose.Schema({
  linkedin: { type: String, default: '' },
  twitter:  { type: String, default: '' },
  website:  { type: String, default: '' },
}, { _id: false });

// ── Entrepreneur-specific sub-schema ──────────────────────────────────────
const startupSchema = new mongoose.Schema({
  name:        { type: String, default: '' },
  description: { type: String, default: '' },
  industry:    { type: String, default: '' },
  stage:       {
    type: String,
    enum: ['idea', 'mvp', 'early-revenue', 'scaling', 'established'],
    default: 'idea',
  },
  fundingNeeded: { type: Number, default: 0 },   // in USD
  founded:       { type: Number },               // year
  teamSize:      { type: Number, default: 1 },
  pitchDeck:     { type: String, default: '' },  // file URL
  website:       { type: String, default: '' },
}, { _id: false });

// ── Investor-specific sub-schema ───────────────────────────────────────────
const investmentPreferencesSchema = new mongoose.Schema({
  industries:      [{ type: String }],
  stages:          [{ type: String }],
  ticketSizeMin:   { type: Number, default: 0 },
  ticketSizeMax:   { type: Number, default: 0 },
  portfolioSize:   { type: Number, default: 0 },
  totalInvested:   { type: Number, default: 0 },
  pastInvestments: [{ type: String }],
}, { _id: false });

// ── Main User schema ───────────────────────────────────────────────────────
const userSchema = new mongoose.Schema(
  {
    // ── Identity
    name:     { type: String, required: true, trim: true },
    email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 8, select: false },

    // ── Role
    role: {
      type: String,
      enum: ['entrepreneur', 'investor'],
      required: true,
    },

    // ── Common profile fields
    bio:      { type: String, default: '', maxlength: 500 },
    avatar:   { type: String, default: '' },   // URL
    location: { type: String, default: '' },
    phone:    { type: String, default: '' },
    social:   { type: socialLinksSchema, default: () => ({}) },

    // ── Role-specific profile data
    startup:               { type: startupSchema, default: null },
    investmentPreferences: { type: investmentPreferencesSchema, default: null },

    // ── Account state
    isEmailVerified: { type: Boolean, default: false },
    isActive:        { type: Boolean, default: true },
    lastLogin:       { type: Date },

    // ── Connections (mutual)
    connections: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

// ── Indexes ────────────────────────────────────────────────────────────────
// email already indexed via unique:true
userSchema.index({ role: 1 });

// ── Hash password before saving ────────────────────────────────────────────
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ── Instance method: compare passwords ────────────────────────────────────
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// ── Instance method: safe public profile (no password) ────────────────────
userSchema.methods.toPublicJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', userSchema);