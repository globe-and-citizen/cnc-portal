import express from 'express';
import { upload } from '../utils/upload';
import { MAX_FILES_UPLOAD } from '../services/storageService';
import { uploadManyFiles } from '../controllers/uploadController';

const uploadRouter = express.Router();

/**
 * @openapi
 * /upload:
 *   post:
 *     summary: Upload one or many files
 *     description: |
 *       Uploads one or many files (images or documents) to Storage and returns presigned URLs.
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
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Files to upload (image or document), up to 10 files
 *     responses:
 *       200:
 *         description: Files uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 files:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       fileUrl:
 *                         type: string
 *                         description: Presigned URL for accessing the uploaded file (24h expiry)
 *                       fileKey:
 *                         type: string
 *                         description: S3 object key for the uploaded file (unique identifier)
 *                       metadata:
 *                         type: object
 *                         properties:
 *                           key:
 *                             type: string
 *                             description: S3 object key (unique identifier)
 *                           fileType:
 *                             type: string
 *                             description: MIME type of the file
 *                           fileSize:
 *                             type: number
 *                             description: File size in bytes
 *                 count:
 *                   type: number
 *                   description: Number of uploaded files
 *             examples:
 *               example1:
 *                 value:
 *                   files:
 *                     - fileUrl: "https://storage.example.com/claims/abc123.pdf"
 *                       fileKey: "claims/2024/01/abc123.pdf"
 *                       metadata:
 *                         key: "claims/2024/01/abc123.pdf"
 *                         fileType: "application/pdf"
 *                         fileSize: 102400
 *                   count: 1
 *       400:
 *         description: Bad request - no files provided or invalid file type
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden - authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error - storage not configured or upload failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
uploadRouter.post('/', upload.array('files', MAX_FILES_UPLOAD), uploadManyFiles);

export default uploadRouter;
