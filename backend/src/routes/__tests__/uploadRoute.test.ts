import { describe, expect, it, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';
import { Readable } from 'stream';

// Hoist mocks
const { mockUploadArray, mockUploadFiles, mockGetPresignedDownloadUrl, mockIsStorageConfigured } =
  vi.hoisted(() => ({
    mockUploadArray: vi.fn((fieldName: string) => {
      return (req: Request, res: Response, next: NextFunction) => {
        // Simulate multer adding files to request
        if (req.body.hasFiles) {
          req.files = [
            {
              fieldname: fieldName,
              originalname: 'test-image-1.jpg',
              encoding: '7bit',
              mimetype: 'image/jpeg',
              buffer: Buffer.from('fake-image-data-1'),
              stream: new Readable(),
              destination: '',
              filename: 'test-image-1.jpg',
              path: '/tmp/test-image-1.jpg',
              size: Buffer.from('fake-image-data-1').length,
            },
            {
              fieldname: fieldName,
              originalname: 'test-image-2.jpg',
              encoding: '7bit',
              mimetype: 'image/jpeg',
              buffer: Buffer.from('fake-image-data-2'),
              stream: new Readable(),
              destination: '',
              filename: 'test-image-2.jpg',
              path: '/tmp/test-image-2.jpg',
              size: Buffer.from('fake-image-data-2').length,
            },
          ];
        }
        next();
      };
    }),
    mockUploadFiles: vi.fn(),
    mockGetPresignedDownloadUrl: vi.fn(),
    mockIsStorageConfigured: vi.fn(() => true),
  }));

vi.mock('../../utils/upload', () => ({
  upload: {
    array: mockUploadArray,
  },
}));

vi.mock('../../services/storageService', () => ({
  uploadFiles: mockUploadFiles,
  getPresignedDownloadUrl: mockGetPresignedDownloadUrl,
  isStorageConfigured: mockIsStorageConfigured,
  MAX_FILES_PER_CLAIM: 10,
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
    it('should return 400 if no files are provided', async () => {
      const response = await request(app).post('/').send({});

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'No files provided' });
    });

    it('should upload files and return urls with metadata', async () => {
      const mockMetadata1 = {
        key: 'uploads/abc123hash.jpg',
        fileType: 'image/jpeg',
        fileSize: 1024,
      };
      const mockMetadata2 = {
        key: 'uploads/def456hash.jpg',
        fileType: 'image/jpeg',
        fileSize: 2048,
      };

      mockUploadFiles.mockResolvedValue([
        { success: true, metadata: mockMetadata1 },
        { success: true, metadata: mockMetadata2 },
      ]);
      mockGetPresignedDownloadUrl
        .mockResolvedValueOnce('https://storage.railway.app/bucket/uploads/abc123hash.jpg?signed')
        .mockResolvedValueOnce('https://storage.railway.app/bucket/uploads/def456hash.jpg?signed');

      const response = await request(app).post('/').send({ hasFiles: true });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        files: [
          {
            fileUrl: 'https://storage.railway.app/bucket/uploads/abc123hash.jpg?signed',
            fileKey: mockMetadata1.key,
            metadata: mockMetadata1,
          },
          {
            fileUrl: 'https://storage.railway.app/bucket/uploads/def456hash.jpg?signed',
            fileKey: mockMetadata2.key,
            metadata: mockMetadata2,
          },
        ],
        count: 2,
      });
      expect(mockUploadFiles).toHaveBeenCalled();
      expect(mockGetPresignedDownloadUrl).toHaveBeenCalledWith(mockMetadata1.key, 86400);
      expect(mockGetPresignedDownloadUrl).toHaveBeenCalledWith(mockMetadata2.key, 86400);
    });

    it('should return 500 if upload fails', async () => {
      const errorMessage = 'Upload failed';
      mockUploadFiles.mockResolvedValue([{ success: false, error: errorMessage }]);

      const response = await request(app).post('/').send({ hasFiles: true });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        error: 'Failed to upload file',
        details: errorMessage,
      });
    });

    it.skip('should return 500 if storage is not configured', async () => {
      mockIsStorageConfigured.mockReturnValue(false);

      const response = await request(app).post('/').send({ hasFiles: true });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Storage not configured');
    });

    it('should handle unexpected exceptions', async () => {
      mockUploadFiles.mockRejectedValue(new Error('Unexpected error'));

      const response = await request(app).post('/').send({ hasFiles: true });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        error: 'Failed to upload files',
        details: 'Unexpected error',
      });
    });
  });
});
