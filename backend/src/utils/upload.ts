// upload.ts
import multer, { Multer, FileFilterCallback } from 'multer';
import { bucket } from './storage';
import { v4 as uuidv4 } from 'uuid';
import { Request } from 'express';
import { Storage } from '@google-cloud/storage';

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
    const blob = bucket.file(`${uuidv4()}-${file.originalname}`);
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
