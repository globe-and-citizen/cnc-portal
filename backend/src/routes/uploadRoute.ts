// routes/uploadRoute.ts
import express, { Request, Response } from 'express';
import { upload } from '../utils/upload';
import {
  uploadFile,
  getPresignedDownloadUrl,
  isStorageConfigured,
  ALLOWED_IMAGE_MIMETYPES,
} from '../services/storageService';

const uploadRouter = express.Router();

// Définition du type pour req.file, car Express ne le reconnaît pas par défaut
interface MulterRequest extends Request {
  file: Express.Multer.File;
}

uploadRouter.post('/', upload.single('image'), async (req: Request, res: Response) => {
  try {
    const multerReq = req as MulterRequest;

    if (!multerReq.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    // Ensure storage is configured
    if (!isStorageConfigured()) {
      return res.status(500).json({
        error: 'Storage not configured',
        details:
          'Railway Storage is not configured. Please set BUCKET, ACCESS_KEY_ID, and SECRET_ACCESS_KEY environment variables.',
      });
    }

    // Only allow images here
    if (!(ALLOWED_IMAGE_MIMETYPES as readonly string[]).includes(multerReq.file.mimetype)) {
      return res.status(400).json({
        error: 'Invalid file type',
        details: `Only image files are allowed: ${ALLOWED_IMAGE_MIMETYPES.join(', ')}`,
      });
    }

    // Upload to Railway Storage under images/
    const uploadResult = await uploadFile(multerReq.file, 'images');

    if (!uploadResult.success) {
      return res.status(500).json({ error: 'Failed to upload image', details: uploadResult.error });
    }

    const imageUrl = await getPresignedDownloadUrl(uploadResult.metadata.key, 86400); // 24h
    res.json({ imageUrl, metadata: uploadResult.metadata });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
    res.status(500).json({
      error: 'Failed to upload image',
      details: errorMessage,
    });
  }
});

export default uploadRouter;
