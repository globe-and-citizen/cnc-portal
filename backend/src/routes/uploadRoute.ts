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

/**
 * @openapi
 * /upload:
 *   post:
 *     summary: Upload an image to Railway Storage
 *     description: Uploads a single image file to Railway Storage and returns a presigned URL
 *     tags: [Upload]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: The image file to upload
 *     responses:
 *       200:
 *         description: Image uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 imageUrl:
 *                   type: string
 *                   description: Presigned URL for accessing the uploaded image
 *                 metadata:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     key:
 *                       type: string
 *                     fileName:
 *                       type: string
 *                     fileType:
 *                       type: string
 *                     fileSize:
 *                       type: number
 *                     uploadedAt:
 *                       type: string
 *       400:
 *         description: No file provided or invalid file type
 *       500:
 *         description: Storage not configured or upload failed
 */
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
