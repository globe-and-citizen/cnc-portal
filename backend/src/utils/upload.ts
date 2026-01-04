// upload.ts
import multer, { Multer } from 'multer';
// import { v4 as uuidv4 } from 'uuid'; // Commented out - not needed for database storage
// import path from 'path'; // Commented out - not needed for database storage
// import { bucket } from './storage'; // Commented out - cloud storage disabled


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

// Use memory storage to keep file buffers in memory for database storage
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

/**
 * DEPRECATED: Cloud storage upload function
 * This function is kept for backwards compatibility but is no longer used.
 * New uploads should store files directly in the database via ClaimAttachment model.
 * 
 * To re-enable cloud storage, uncomment the code below.
 */
// const uploadFileToGCS = (file: MulterFile): Promise<string> => {
//   return new Promise((resolve, reject) => {
//     if (!bucket) {
//       reject(new Error('Cloud storage is disabled. Use database storage instead.'));
//       return;
//     }
//     // Preserve original file extension
//     const ext = path.extname(file.originalname);
//     const blob = bucket.file(`${uuidv4()}${ext}`);
//     const blobStream = blob.createWriteStream({
//       resumable: false,
//       contentType: file.mimetype,
//     });

//     blobStream.on('error', (err) => reject(err));

//     blobStream.on('finish', () => {
//       const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
//       resolve(publicUrl);
//     });

//     blobStream.end(file.buffer);
//   });
// };

// Placeholder function that returns an error
const uploadFileToGCS = (): Promise<string> => {
  return Promise.reject(
    new Error('Cloud storage is disabled. Files are now stored directly in the database.')
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
