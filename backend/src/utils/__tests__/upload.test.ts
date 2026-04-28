import { beforeEach, describe, expect, it, vi } from 'vitest';

const { multerState } = vi.hoisted(() => ({
  multerState: {
    options: undefined as any,
  },
}));

// Mock storageService
vi.mock('../../services/storageService', () => ({
  ALLOWED_IMAGE_MIMETYPES: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'],
  ALLOWED_DOCUMENT_MIMETYPES: [
    'application/pdf',
    'text/plain',
    'application/zip',
    'application/x-zip-compressed',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
  ALLOWED_MIMETYPES: [
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/webp',
    'application/pdf',
    'text/plain',
    'application/zip',
    'application/x-zip-compressed',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
  MAX_FILE_SIZE: 10 * 1024 * 1024,
}));

// Mock multer
vi.mock('multer', () => {
  const mockMemoryStorage = vi.fn(() => ({}));
  const mockMulter: ReturnType<typeof vi.fn> & { memoryStorage?: ReturnType<typeof vi.fn> } = vi.fn(
    (options: unknown) => {
      multerState.options = options;
      return {
      single: vi.fn(),
      array: vi.fn(),
      };
    }
  );
  mockMulter.memoryStorage = mockMemoryStorage;
  return {
    default: mockMulter,
  };
});

describe('upload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    multerState.options = undefined;
  });

  describe('upload middleware', () => {
    it('should export upload middleware', async () => {
      const { upload } = await import('../upload');

      expect(upload).toBeDefined();
      expect(upload.single).toBeDefined();
      expect(typeof upload.single).toBe('function');
    });

    it('should accept allowed mimetypes in fileFilter', async () => {
      await import('../upload');

      const callback = vi.fn();
      multerState.options.fileFilter(
        {} as any,
        { mimetype: 'image/png' } as any,
        callback
      );

      expect(callback).toHaveBeenCalledWith(null, true);
    });

    it('should reject unsupported mimetypes in fileFilter', async () => {
      await import('../upload');

      const callback = vi.fn();
      multerState.options.fileFilter(
        {} as any,
        { mimetype: 'application/octet-stream' } as any,
        callback
      );

      expect(callback).toHaveBeenCalledTimes(1);
      const [error] = callback.mock.calls[0];
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain('Only image files');
    });

    it('should export ALLOWED_IMAGE_MIMETYPES', async () => {
      const { ALLOWED_IMAGE_MIMETYPES } = await import('../upload');

      expect(ALLOWED_IMAGE_MIMETYPES).toBeDefined();
      expect(ALLOWED_IMAGE_MIMETYPES).toContain('image/png');
      expect(ALLOWED_IMAGE_MIMETYPES).toContain('image/jpeg');
    });

    it('should export ALLOWED_DOCUMENT_MIMETYPES', async () => {
      const { ALLOWED_DOCUMENT_MIMETYPES } = await import('../upload');

      expect(ALLOWED_DOCUMENT_MIMETYPES).toBeDefined();
      expect(ALLOWED_DOCUMENT_MIMETYPES).toContain('application/pdf');
    });
  });
});
