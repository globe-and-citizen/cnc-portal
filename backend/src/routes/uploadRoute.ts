// routes/uploadRoute.ts
import express, { Request, Response } from 'express';
import { upload, uploadImageToGCS } from '../utils/upload';

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

    const publicUrl = await uploadImageToGCS(multerReq.file);
    res.json({ imageUrl: publicUrl });
  } catch (err: any) {
    res.status(500).json({
      error: 'Failed to upload image',
      details: err.message || err,
    });
  }
});

export default uploadRouter;
