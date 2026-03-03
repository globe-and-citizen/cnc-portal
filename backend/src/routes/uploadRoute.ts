// routes/uploadRoute.ts
import express, { Request, Response } from 'express';
import { upload } from '../utils/upload';
import { uploadFile, getPresignedDownloadUrl, ALLOWED_MIMETYPES } from '../services/storageService';

const uploadRouter = express.Router();

// Définition du type pour req.file, car Express ne le reconnaît pas par défaut
interface MulterRequest extends Request {
  file: Express.Multer.File;
}

/**
 * @openapi
 * /upload:
 *   post:
 *     summary: Upload a file
 *     description: |
 *       Uploads a single file (image or document) to Storage and returns a presigned URL.
 *       Supported file types:
 *       - Images: png, jpeg, webp
 *       - Documents: pdf, txt, zip, docx
 *     tags: [Upload]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: The file to upload (image or document)
 *     responses:
 *       200:
 *         description: File uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 fileUrl:
 *                   type: string
 *                   description: Presigned URL for accessing the uploaded file (24h expiry)
 *                 fileKey:
 *                   type: string
 *                   description: S3 object key for the uploaded file (unique identifier)
 *                 metadata:
 *                   type: object
 *                   properties:
 *                     key:
 *                       type: string
 *                       description: S3 object key (unique identifier)
 *                     fileType:
 *                       type: string
 *                       description: MIME type of the file
 *                     fileSize:
 *                       type: number
 *                       description: File size in bytes
 *       400:
 *         description: No file provided or invalid file type
 *       500:
 *         description: Storage not configured or upload failed
 */
uploadRouter.post('/', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const multerReq = req as MulterRequest;

    if (!multerReq.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    // Allow images and documents (pdf, txt, zip, docx)
    if (!ALLOWED_MIMETYPES.includes(multerReq.file.mimetype)) {
      return res.status(400).json({
        error: 'Invalid file type',
        details: `Only images and documents are allowed: ${ALLOWED_MIMETYPES.join(', ')}`,
      });
    }

    // Upload to Storage under uploads/
    const uploadResult = await uploadFile(multerReq.file, 'uploads');

    if (!uploadResult.success) {
      return res.status(500).json({ error: 'Failed to upload file', details: uploadResult.error });
    }

    const fileUrl = await getPresignedDownloadUrl(uploadResult.metadata.key, 86400); // 24h
    res.json({ fileUrl, fileKey: uploadResult.metadata.key, metadata: uploadResult.metadata });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
    res.status(500).json({
      error: 'Failed to upload file',
      details: errorMessage,
    });
  }
});

export default uploadRouter;
