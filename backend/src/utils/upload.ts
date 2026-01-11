// upload.ts
/**
 * Multer configuration for file uploads using Railway S3 storage.
 * Files are buffered in memory and then sent to storage via storageService.
 */
import multer, { Multer } from 'multer';
import {
  ALLOWED_IMAGE_MIMETYPES,
  ALLOWED_DOCUMENT_MIMETYPES,
  ALLOWED_MIMETYPES,
  MAX_FILE_SIZE,
} from '../services/storageService';

// Use memory storage to keep file buffers in memory for storage upload
const storage = multer.memoryStorage();
const upload: Multer = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIMETYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          'Only image files (png, jpg, jpeg, webp) and documents (pdf, txt, zip, docx) are allowed'
        )
      );
    }
  },
});

export { upload, ALLOWED_IMAGE_MIMETYPES, ALLOWED_DOCUMENT_MIMETYPES };
