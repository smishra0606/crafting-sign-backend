import express from 'express';
import upload from '../config/cloudinary.js';
import { protect, admin } from '../middleware/auth.js';

const router = express.Router();

// @route POST /api/uploads
// @desc  Upload single image to Cloudinary and return URL
// @access Private/Admin
router.post('/', protect, admin, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file provided' });
    }
    // Cloudinary storage exposes the uploaded path in req.file.path
    // Log file info for debugging upload issues
    console.log('Upload successful, file:', {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path
    });
    return res.status(201).json({ url: req.file.path });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Upload failed', error: error.message });
  }
});

export default router;
