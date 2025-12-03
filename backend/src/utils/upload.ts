// upload.ts
import multer, { Multer } from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { bucket } from './storage';

interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

const storage = multer.memoryStorage();
const upload: Multer = multer({ storage });

const uploadImageToGCS = (file: MulterFile): Promise<string> => {
  return new Promise((resolve, reject) => {
    const blob = bucket.file(`${uuidv4()}`);
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

export { upload, uploadImageToGCS };
