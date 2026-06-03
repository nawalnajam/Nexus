const { validationResult } = require('express-validator');
const User = require('../models/User');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { sendOTPEmail } = require('../config/email');
const OTP = require('../models/OTP');
const crypto = require('crypto');

// ─── Helper ────────────────────────────────────────────────────────────────
const sendTokenResponse = (user, statusCode, res) => {
  const accessToken  = generateAccessToken(user._id, user.role);
  const refreshToken = generateRefreshToken(user._id);

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge:   30 * 24 * 60 * 60 * 1000,
  });

  res.status(statusCode).json({
    success: true,
    accessToken,
    user: user.toPublicJSON(),
  });
};

// ─── POST /api/auth/register ───────────────────────────────────────────────
exports.register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ success: false, errors: errors.array() });

    const { name, email, password, role } = req.body;

    const existing = await User.findOne({ email });
    if (existing)
      return res.status(409).json({ success: false, message: 'Email already registered' });

    // Auto generate avatar from name
    const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff&size=128`;

    const user = await User.create({ name, email, password, role, avatar });
    sendTokenResponse(user, 201, res);
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/auth/login ──────────────────────────────────────────────────
exports.login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ success: false, errors: errors.array() });

    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password)))
      return res.status(401).json({ success: false, message: 'Invalid email or password' });

    if (!user.isActive)
      return res.status(403).json({ success: false, message: 'Account deactivated' });

    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    sendTokenResponse(user, 200, res);
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/auth/refresh ────────────────────────────────────────────────
exports.refresh = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token)
      return res.status(401).json({ success: false, message: 'No refresh token' });

    const decoded = verifyRefreshToken(token);
    const user    = await User.findById(decoded.id);
    if (!user || !user.isActive)
      return res.status(401).json({ success: false, message: 'Invalid refresh token' });

    const accessToken = generateAccessToken(user._id, user.role);
    res.json({ success: true, accessToken });
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/auth/logout ─────────────────────────────────────────────────
exports.logout = (_req, res) => {
  res.clearCookie('refreshToken');
  res.json({ success: true, message: 'Logged out' });
};

// ─── GET /api/auth/me ──────────────────────────────────────────────────────
exports.getMe = async (req, res, next) => {
  try {
    let user = req.user;

    // Avatar nahi hai toh auto generate karo
    if (!user.avatar) {
      user.avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random&color=fff&size=128`;
      await user.save({ validateBeforeSave: false });
    }

    res.json({ success: true, user: user.toPublicJSON() });
  } catch (err) {
    next(err);
  }
};


// ─── POST /api/auth/send-otp ───────────────────────────────────────────────
exports.sendOTP = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user)
      return res.status(404).json({ success: false, message: 'User not found' });

    // Generate 6 digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();

    // Save OTP to DB (delete old ones first)
    await OTP.deleteMany({ email });
    await OTP.create({
      email,
      otp,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    });

    // Send email
    await sendOTPEmail(email, otp, user.name);
    // OTP ko terminal mein print karo
console.log(`OTP for ${email}: ${otp}`);

    res.json({ success: true, message: `OTP sent to ${email}` });
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/auth/verify-otp ─────────────────────────────────────────────
exports.verifyOTP = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    const otpDoc = await OTP.findOne({ email, used: false });

    if (!otpDoc)
      return res.status(400).json({ success: false, message: 'OTP not found or already used' });

    if (otpDoc.otp !== otp)
      return res.status(400).json({ success: false, message: 'Invalid OTP' });

    if (otpDoc.expiresAt < new Date())
      return res.status(400).json({ success: false, message: 'OTP expired' });

    // Mark as used
    otpDoc.used = true;
    await otpDoc.save();

    // Login the user
    const user = await User.findOne({ email });
    sendTokenResponse(user, 200, res);
  } catch (err) {
    next(err);
  }
};