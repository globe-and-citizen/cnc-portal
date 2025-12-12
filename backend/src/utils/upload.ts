// upload.ts
import multer, { Multer } from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { bucket } from './storage';

interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

// Allowed MIME types for images and documents
const ALLOWED_IMAGE_MIMETYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

const ALLOWED_DOCUMENT_MIMETYPES = [
  'application/pdf',
  'text/plain',
  'application/zip',
  'application/x-zip-compressed',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
];

const ALLOWED_MIMETYPES = [...ALLOWED_IMAGE_MIMETYPES, ...ALLOWED_DOCUMENT_MIMETYPES];

const storage = multer.memoryStorage();
const upload: Multer = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
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

const uploadFileToGCS = (file: MulterFile): Promise<string> => {
  return new Promise((resolve, reject) => {
    // Preserve original file extension
    const ext = path.extname(file.originalname);
    const blob = bucket.file(`${uuidv4()}${ext}`);
    const blobStream = blob.createWriteStream({
      resumable: false,
      contentType: file.mimetype,
    });

    blobStream.on('error', (err) => reject(err));

    blobStream.on('finish', () => {
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
      resolve(publicUrl);
    });

    blobStream.end(file.buffer);
  });
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
