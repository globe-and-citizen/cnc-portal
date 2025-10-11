import { describe, expect, it, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

// Hoist mocks
const { mockUploadSingle, mockUploadImageToGCS } = vi.hoisted(() => ({
  mockUploadSingle: vi.fn((fieldName: string) => {
    return (req: any, res: any, next: any) => {
      // Simulate multer adding file to request
      if (req.body.hasFile) {
        req.file = {
          fieldname: fieldName,
          originalname: 'test-image.jpg',
          encoding: '7bit',
          mimetype: 'image/jpeg',
          buffer: Buffer.from('fake-image-data'),
          size: 1024,
        };
      }
      next();
    };
  }),
  mockUploadImageToGCS: vi.fn(),
}));

vi.mock('../../utils/upload', () => ({
  upload: {
    single: mockUploadSingle,
  },
  uploadImageToGCS: mockUploadImageToGCS,
}));

// Import after mock
import uploadRouter from '../../routes/uploadRoute';

describe('uploadRoute', () => {
  let app: express.Application;

  beforeEach(() => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/', uploadRouter);
  });

  describe('POST /', () => {
    it('should return 400 if no file is provided', async () => {
      const response = await request(app).post('/').send({});

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'No file provided' });
    });

    it('should upload file and return image URL', async () => {
      const mockPublicUrl = 'https://storage.googleapis.com/bucket-name/uuid-file.jpg';
      mockUploadImageToGCS.mockResolvedValue(mockPublicUrl);

      const response = await request(app).post('/').send({ hasFile: true });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ imageUrl: mockPublicUrl });
      expect(mockUploadImageToGCS).toHaveBeenCalled();
    });

    it('should return 500 if upload fails', async () => {
      const errorMessage = 'Upload failed';
      mockUploadImageToGCS.mockRejectedValue(new Error(errorMessage));

      const response = await request(app).post('/').send({ hasFile: true });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        error: 'Failed to upload image',
        details: errorMessage,
      });
    });

    it('should handle non-Error exceptions', async () => {
      mockUploadImageToGCS.mockRejectedValue('String error');

      const response = await request(app).post('/').send({ hasFile: true });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        error: 'Failed to upload image',
        details: 'String error',
      });
    });
  });
});
