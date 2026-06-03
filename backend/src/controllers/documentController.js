const Document = require('../models/Document');
const cloudinary = require('../config/cloudinary');

// ─── POST /api/documents ───────────────────────────────────────────────────
exports.uploadDocument = async (req, res, next) => {
  try {
    if (!req.file)
      return res.status(400).json({ success: false, message: 'No file uploaded' });

    const { title, description, category, sharedWith, meetingId } = req.body;

    const document = await Document.create({
      title:       title || req.file.originalname,
      description: description || '',
      fileName:    req.file.originalname,
      fileUrl:     req.file.path,
      publicId:    req.file.filename,
      fileType:    req.file.originalname.split('.').pop(),
      fileSize:    req.file.size,
      mimeType:    req.file.mimetype,
      uploadedBy:  req.user._id,
      sharedWith:  sharedWith ? JSON.parse(sharedWith) : [],
      category:    category || 'other',
      meeting:     meetingId || null,
    });

    await document.populate('uploadedBy', 'name email avatar');

    res.status(201).json({ success: true, document });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/documents ────────────────────────────────────────────────────
exports.getMyDocuments = async (req, res, next) => {
  try {
    const { category, status } = req.query;
    const userId = req.user._id;

    const query = {
      $or: [{ uploadedBy: userId }, { sharedWith: userId }],
    };
    if (category) query.category = category;
    if (status)   query.status   = status;

    const documents = await Document.find(query)
      .populate('uploadedBy', 'name email avatar')
      .populate('sharedWith', 'name email avatar')
      .sort({ createdAt: -1 });

    res.json({ success: true, total: documents.length, documents });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/documents/:id ────────────────────────────────────────────────
exports.getDocument = async (req, res, next) => {
  try {
    const document = await Document.findById(req.params.id)
      .populate('uploadedBy sharedWith', 'name email avatar')
      .populate('signatures.signedBy', 'name email avatar');

    if (!document)
      return res.status(404).json({ success: false, message: 'Document not found' });

    const hasAccess =
      String(document.uploadedBy._id) === String(req.user._id) ||
      document.sharedWith.some(u => String(u._id) === String(req.user._id));

    if (!hasAccess)
      return res.status(403).json({ success: false, message: 'Access denied' });

    res.json({ success: true, document });
  } catch (err) {
    next(err);
  }
};

// ─── DELETE /api/documents/:id ─────────────────────────────────────────────
exports.deleteDocument = async (req, res, next) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document)
      return res.status(404).json({ success: false, message: 'Document not found' });

    if (String(document.uploadedBy) !== String(req.user._id))
      return res.status(403).json({ success: false, message: 'Only uploader can delete' });

    // Try to delete from Cloudinary (don't fail if it errors)
    try {
      if (document.publicId) {
        await cloudinary.uploader.destroy(document.publicId, { resource_type: 'raw' });
      }
    } catch (cloudErr) {
      console.log('Cloudinary delete warning:', cloudErr.message);
    }

    // Always delete from DB
    await document.deleteOne();

    res.json({ success: true, message: 'Document deleted' });
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/documents/:id/sign ─────────────────────────────────────────
exports.signDocument = async (req, res, next) => {
  try {
    if (!req.file)
      return res.status(400).json({ success: false, message: 'Signature image required' });

    const document = await Document.findById(req.params.id);
    if (!document)
      return res.status(404).json({ success: false, message: 'Document not found' });

    // Check already signed
    const alreadySigned = document.signatures.some(
      s => String(s.signedBy) === String(req.user._id)
    );
    if (alreadySigned)
      return res.status(400).json({ success: false, message: 'Already signed' });

    document.signatures.push({
      signedBy:     req.user._id,
      signatureUrl: req.file.path,
      signedAt:     new Date(),
      ipAddress:    req.ip,
    });

    await document.save();
    await document.populate('uploadedBy sharedWith signatures.signedBy', 'name email avatar');

    res.json({ success: true, document });
  } catch (err) {
    next(err);
  }
};

// ─── PUT /api/documents/:id/status ────────────────────────────────────────
exports.updateDocumentStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const document = await Document.findById(req.params.id);

    if (!document)
      return res.status(404).json({ success: false, message: 'Document not found' });

    if (String(document.uploadedBy) !== String(req.user._id))
      return res.status(403).json({ success: false, message: 'Access denied' });

    document.status = status;
    await document.save();

    res.json({ success: true, document });
  } catch (err) {
    next(err);
  }
};