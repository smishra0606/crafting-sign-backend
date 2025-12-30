import express from 'express';
import upload from '../middleware/uploadMiddleware.js';
import { protect, admin } from '../middleware/auth.js';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// Configure S3 client for DigitalOcean Spaces (S3-compatible)
const spacesEndpoint = process.env.SPACES_ENDPOINT; // e.g. nyc3.digitaloceanspaces.com
const s3Client = new S3Client({
  region: process.env.SPACES_REGION || 'us-east-1',
  endpoint: spacesEndpoint ? `https://${spacesEndpoint}` : undefined,
  credentials: {
    accessKeyId: process.env.SPACES_KEY,
    secretAccessKey: process.env.SPACES_SECRET,
  },
});

const router = express.Router();

// @route POST /api/uploads
// @desc  Upload single image to Cloudinary and return URL
// @access Private/Admin
router.post('/', protect, admin, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file provided' });
    }
    // We now receive the file buffer (memoryStorage). Upload to DigitalOcean Spaces and return public URL
    const file = req.file;
    if (!file || !file.buffer) {
      return res.status(500).json({ message: 'No file buffer available after upload' });
    }

    const bucket = process.env.SPACES_BUCKET;
    if (!bucket) {
      return res.status(500).json({ message: 'SPACES_BUCKET is not configured in .env' });
    }

    // Build a safe key/name for the object
    const key = `uploads/${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

    const putParams = {
      Bucket: bucket,
      Key: key,
      Body: file.buffer,
      ACL: 'public-read',
      ContentType: file.mimetype,
    };

    try {
      await s3Client.send(new PutObjectCommand(putParams));
    } catch (err) {
      console.error('Spaces upload error:', err);
      return res.status(500).json({ message: 'Upload to storage failed', error: err.message });
    }

    // Construct public URL. If SPACES_BASE_URL provided use it, otherwise derive from endpoint
    let publicUrl = process.env.SPACES_BASE_URL || (bucket && spacesEndpoint ? `https://${bucket}.${spacesEndpoint}/${key}` : null);
    if (!publicUrl) publicUrl = key;

    console.log('Upload successful, file:', { originalname: file.originalname, mimetype: file.mimetype, size: file.size, url: publicUrl });
    return res.status(201).json({ url: publicUrl });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Upload failed', error: error.message });
  }
});

export default router;
