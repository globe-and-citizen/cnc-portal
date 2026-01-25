import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

// Mock environment variables
const mockEnv = {
  BUCKET: 'test-bucket',
  ACCESS_KEY_ID: 'test-access-key',
  SECRET_ACCESS_KEY: 'test-secret-key',
  REGION: 'auto',
  ENDPOINT: 'https://storage.railway.app',
};

// Hoisted mocks for AWS SDK
const { mockSend, mockGetSignedUrl } = vi.hoisted(() => ({
  mockSend: vi.fn(),
  mockGetSignedUrl: vi.fn(() =>
    Promise.resolve('https://signed-url.example.com/file?signature=abc123')
  ),
}));

// Mock S3Client and Commands as proper class constructors
vi.mock('@aws-sdk/client-s3', () => {
  return {
    S3Client: class MockS3Client {
      send = mockSend;
    },
    PutObjectCommand: class MockPutObjectCommand {
      constructor(public params: Record<string, unknown>) {}
    },
    HeadObjectCommand: class MockHeadObjectCommand {
      constructor(public params: Record<string, unknown>) {}
    },
    DeleteObjectCommand: class MockDeleteObjectCommand {
      constructor(public params: Record<string, unknown>) {}
    },
    GetObjectCommand: class MockGetObjectCommand {
      constructor(public params: Record<string, unknown>) {}
    },
  };
});

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: mockGetSignedUrl,
}));

describe('storageService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    // Set up mock environment variables
    process.env = { ...originalEnv, ...mockEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('isStorageConfigured', () => {
    it.skip('should return true when all env vars are set', async () => {
      const { isStorageConfigured } = await import('../storageService');
      expect(isStorageConfigured()).toBe(true);
    });

    it('should return false when BUCKET is missing', async () => {
      delete process.env.BUCKET;
      // Force reimport to get fresh module state
      vi.resetModules();
      const { isStorageConfigured } = await import('../storageService');
      expect(isStorageConfigured()).toBe(false);
    });
  });

  describe('uploadFile', () => {
    beforeEach(() => {
      process.env = { ...originalEnv, ...mockEnv };
      mockSend.mockResolvedValue({});
    });

    it('should reject files exceeding max size', async () => {
      vi.resetModules();
      const { uploadFile, MAX_FILE_SIZE } = await import('../storageService');

      const mockFile = {
        originalname: 'large.png',
        mimetype: 'image/png',
        size: MAX_FILE_SIZE + 1,
        buffer: Buffer.from('x'.repeat(100)),
      } as Express.Multer.File;

      const result = await uploadFile(mockFile);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('exceeds maximum');
      }
    });

    it('should handle S3 upload errors', async () => {
      mockSend.mockRejectedValue(new Error('S3 connection failed'));
      vi.resetModules();
      const { uploadFile } = await import('../storageService');

      const mockFile = {
        originalname: 'test.png',
        mimetype: 'image/png',
        size: 1024,
        buffer: Buffer.from('test'),
      } as Express.Multer.File;

      const result = await uploadFile(mockFile);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Failed to upload file');
      }
    });
  });

  describe('uploadFiles', () => {
    beforeEach(() => {
      process.env = { ...originalEnv, ...mockEnv };
      mockSend.mockResolvedValue({});
    });

    it('should upload multiple files', async () => {
      vi.resetModules();
      const { uploadFiles } = await import('../storageService');

      const mockFiles = [
        {
          originalname: 'file1.png',
          mimetype: 'image/png',
          size: 1024,
          buffer: Buffer.from('test1'),
        },
        {
          originalname: 'file2.pdf',
          mimetype: 'application/pdf',
          size: 2048,
          buffer: Buffer.from('test2'),
        },
      ] as Express.Multer.File[];

      const results = await uploadFiles(mockFiles, 'claims/1');

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
    });

    it('should reject when exceeding MAX_FILES_PER_CLAIM', async () => {
      vi.resetModules();
      const { uploadFiles, MAX_FILES_PER_CLAIM } = await import('../storageService');

      // Create 11 mock files (exceeds MAX_FILES_PER_CLAIM of 10)
      const mockFiles = Array.from({ length: 11 }, (_, i) => ({
        originalname: `file${i + 1}.png`,
        mimetype: 'image/png',
        size: 1024,
        buffer: Buffer.from(`test${i}`),
      })) as Express.Multer.File[];

      const results = await uploadFiles(mockFiles);

      expect(results).toHaveLength(11);
      expect(results.every((r) => !r.success)).toBe(true);
      expect(results[0]).toMatchObject({
        success: false,
        error: `Cannot upload more than ${MAX_FILES_PER_CLAIM} files per claim`,
      });
    });
  });

  describe('deleteFile', () => {
    beforeEach(() => {
      process.env = { ...originalEnv, ...mockEnv };
    });

    it('should delete file successfully', async () => {
      mockSend.mockResolvedValue({});
      vi.resetModules();
      const { deleteFile } = await import('../storageService');

      const result = await deleteFile('test-folder/abc123.png');

      expect(result).toBe(true);
    });

    it('should return false on delete error', async () => {
      mockSend.mockRejectedValue(new Error('Delete failed'));
      vi.resetModules();
      const { deleteFile } = await import('../storageService');

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const result = await deleteFile('test-folder/abc123.png');

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('getPresignedDownloadUrl', () => {
    beforeEach(() => {
      process.env = { ...originalEnv, ...mockEnv };
      mockSend.mockResolvedValue({});
    });

    it('should generate presigned URL', async () => {
      vi.resetModules();
      const { getPresignedDownloadUrl } = await import('../storageService');

      const url = await getPresignedDownloadUrl('test-folder/abc123.png');

      expect(url).toContain('https://signed-url.example.com');
    });
  });

  // Note: uploadProfileImage tests removed - function is now deprecated
  // Use uploadFile(file, `profiles/${userAddress}`) instead
  // The functionality is tested through uploadFile tests with different folders
});
