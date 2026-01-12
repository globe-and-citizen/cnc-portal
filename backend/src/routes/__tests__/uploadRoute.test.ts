import { describe, expect, it, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';
import { Readable } from 'stream';

// Hoist mocks
const { mockUploadSingle, mockUploadFile, mockGetPresignedDownloadUrl, mockIsStorageConfigured } =
  vi.hoisted(() => ({
    mockUploadSingle: vi.fn((fieldName: string) => {
      return (req: Request, res: Response, next: NextFunction) => {
        // Simulate multer adding file to request
        if (req.body.hasFile) {
          req.file = {
            fieldname: fieldName,
            originalname: 'test-image.jpg',
            encoding: '7bit',
            mimetype: 'image/jpeg',
            buffer: Buffer.from('fake-image-data'),
            stream: new Readable(),
            destination: '',
            filename: 'test-image.jpg',
            path: '/tmp/test-image.jpg',
            size: Buffer.from('fake-image-data').length,
          };
        }
        next();
      };
    }),
    mockUploadFile: vi.fn(),
    mockGetPresignedDownloadUrl: vi.fn(),
    mockIsStorageConfigured: vi.fn(() => true),
  }));

vi.mock('../../utils/upload', () => ({
  upload: {
    single: mockUploadSingle,
  },
}));

vi.mock('../../services/storageService', () => ({
  uploadFile: mockUploadFile,
  getPresignedDownloadUrl: mockGetPresignedDownloadUrl,
  isStorageConfigured: mockIsStorageConfigured,
  ALLOWED_MIMETYPES: [
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/webp',
    'application/pdf',
    'text/plain',
    'application/zip',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
}));

// Import after mock
import uploadRouter from '../../routes/uploadRoute';

describe('uploadRoute', () => {
  let app: express.Application;

  beforeEach(() => {
    vi.clearAllMocks();
    mockIsStorageConfigured.mockReturnValue(true);
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

    it('should upload file and return image URL with metadata', async () => {
      const mockMetadata = {
        key: 'uploads/abc123hash.jpg',
        fileType: 'image/jpeg',
        fileSize: 1024,
      };
      const mockPresignedUrl = 'https://storage.railway.app/bucket/uploads/abc123hash.jpg?signed';

      mockUploadFile.mockResolvedValue({ success: true, metadata: mockMetadata });
      mockGetPresignedDownloadUrl.mockResolvedValue(mockPresignedUrl);

      const response = await request(app).post('/').send({ hasFile: true });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        fileUrl: mockPresignedUrl,
        fileKey: mockMetadata.key,
        metadata: mockMetadata,
      });
      expect(mockUploadFile).toHaveBeenCalled();
      expect(mockGetPresignedDownloadUrl).toHaveBeenCalledWith(mockMetadata.key, 86400);
    });

    it('should return 500 if upload fails', async () => {
      const errorMessage = 'Upload failed';
      mockUploadFile.mockResolvedValue({ success: false, error: errorMessage });

      const response = await request(app).post('/').send({ hasFile: true });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        error: 'Failed to upload file',
        details: errorMessage,
      });
    });

    it('should return 500 if storage is not configured', async () => {
      mockIsStorageConfigured.mockReturnValue(false);

      const response = await request(app).post('/').send({ hasFile: true });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Storage not configured');
    });

    it('should handle unexpected exceptions', async () => {
      mockUploadFile.mockRejectedValue(new Error('Unexpected error'));

      const response = await request(app).post('/').send({ hasFile: true });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        error: 'Failed to upload file',
        details: 'Unexpected error',
      });
    });
  });
});
