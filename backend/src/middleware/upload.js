const multer = require('multer');
const path = require('path');
const os = require('os');

// ── Store file temporarily in memory ──────────────────────────────────────
const documentFilter = (_req, file, cb) => {
  const allowed = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
  ];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error(`Invalid file type: ${file.mimetype}`), false);
};

const signatureFilter = (_req, file, cb) => {
  if (file.mimetype.startsWith('image/')) cb(null, true);
  else cb(new Error('Signature must be an image'), false);
};

exports.uploadDocument = multer({
  storage: multer.memoryStorage(),
  fileFilter: documentFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
}).single('document');

exports.uploadSignature = multer({
  storage: multer.memoryStorage(),
  fileFilter: signatureFilter,
  limits: { fileSize: 2 * 1024 * 1024 },
}).single('signature');