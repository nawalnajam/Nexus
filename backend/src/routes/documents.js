const express = require('express');
const {
  uploadDocument,
  getMyDocuments,
  getDocument,
  deleteDocument,
  signDocument,
  updateDocumentStatus,
} = require('../controllers/documentController');
const { protect } = require('../middleware/auth');
const { uploadDocument: uploadMiddleware, uploadSignature } = require('../middleware/upload');

const router = express.Router();
router.use(protect);

router.post('/',              uploadMiddleware, uploadDocument);
router.get('/',                                getMyDocuments);
router.get('/:id',                             getDocument);
router.delete('/:id',                          deleteDocument);
router.post('/:id/sign',      uploadSignature, signDocument);
router.put('/:id/status',                      updateDocumentStatus);

module.exports = router;