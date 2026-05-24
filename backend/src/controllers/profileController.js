const { validationResult } = require('express-validator');
const User = require('../models/User');

// ─── GET /api/profiles/me ──────────────────────────────────────────────────
exports.getMyProfile = async (req, res, next) => {
  try {
    res.json({ success: true, profile: req.user.toPublicJSON() });
  } catch (err) {
    next(err);
  }
};

// ─── PUT /api/profiles/me ──────────────────────────────────────────────────
exports.updateMyProfile = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ success: false, errors: errors.array() });

    // Fields allowed for any role
    const commonFields = ['name', 'bio', 'location', 'phone', 'social', 'avatar'];
    const updates = {};
    commonFields.forEach((f) => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

    // Role-specific fields
    if (req.user.role === 'entrepreneur' && req.body.startup) {
      updates.startup = { ...(req.user.startup?.toObject?.() || {}), ...req.body.startup };
    }
    if (req.user.role === 'investor' && req.body.investmentPreferences) {
      updates.investmentPreferences = {
        ...(req.user.investmentPreferences?.toObject?.() || {}),
        ...req.body.investmentPreferences,
      };
    }

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    });

    res.json({ success: true, profile: user.toPublicJSON() });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/profiles/:id ─────────────────────────────────────────────────
exports.getProfileById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).populate('connections', 'name avatar role');
    if (!user || !user.isActive)
      return res.status(404).json({ success: false, message: 'Profile not found' });

    res.json({ success: true, profile: user.toPublicJSON() });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/profiles?role=investor|entrepreneur&page=1&limit=10 ──────────
exports.listProfiles = async (req, res, next) => {
  try {
    const { role, page = 1, limit = 10, search } = req.query;

    const query = { isActive: true };
    if (role && ['investor', 'entrepreneur'].includes(role)) query.role = role;
    if (search) query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { 'startup.name': { $regex: search, $options: 'i' } },
      { bio: { $regex: search, $options: 'i' } },
    ];

    const total    = await User.countDocuments(query);
    const profiles = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({
      success: true,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
      profiles: profiles.map((u) => u.toPublicJSON()),
    });
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/profiles/:id/connect ───────────────────────────────────────
exports.connectWithUser = async (req, res, next) => {
  try {
    const targetId = req.params.id;
    if (targetId === String(req.user._id))
      return res.status(400).json({ success: false, message: "Can't connect with yourself" });

    const target = await User.findById(targetId);
    if (!target)
      return res.status(404).json({ success: false, message: 'User not found' });

    const alreadyConnected = req.user.connections.includes(targetId);
    if (alreadyConnected) {
      // Toggle off (disconnect)
      await User.findByIdAndUpdate(req.user._id, { $pull: { connections: targetId } });
      await User.findByIdAndUpdate(targetId,      { $pull: { connections: req.user._id } });
      return res.json({ success: true, message: 'Disconnected', connected: false });
    }

    await User.findByIdAndUpdate(req.user._id, { $addToSet: { connections: targetId } });
    await User.findByIdAndUpdate(targetId,      { $addToSet: { connections: req.user._id } });

    res.json({ success: true, message: 'Connected', connected: true });
  } catch (err) {
    next(err);
  }
};