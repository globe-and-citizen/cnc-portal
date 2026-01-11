// upload.ts
/**
 * Multer configuration for file uploads
 *
 * This module provides multer middleware for handling file uploads.
 * Files are temporarily stored in memory and then uploaded to Railway Storage
 * via the storageService.
 *
 * @see ../services/storageService.ts for the actual storage implementation
 */
import multer, { Multer } from 'multer';

// Import constants from storage service for consistency
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
  fileFilter: (req, file, cb) => {
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

/**
 * @deprecated Use the storageService directly instead
 * This function is kept for backwards compatibility but will throw an error
 */
const uploadFileToGCS = (): Promise<string> => {
  return Promise.reject(
    new Error(
      'Cloud storage via GCS is disabled. Use storageService.uploadFile() for Railway Storage.'
    )
  );
};

// Keep backwards compatibility alias
const uploadImageToGCS = uploadFileToGCS;

export {
  upload,
  uploadImageToGCS,
  uploadFileToGCS,
  ALLOWED_IMAGE_MIMETYPES,
  ALLOWED_DOCUMENT_MIMETYPES,
};
