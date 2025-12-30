import multer from 'multer';
import dotenv from 'dotenv';

dotenv.config();

// Use memory storage so controllers can access file buffers
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 5 * 1024 * 1024,
  },
});

export default upload;
