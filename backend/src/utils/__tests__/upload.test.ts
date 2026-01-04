import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the bucket
const mockBlobStream = {
  on: vi.fn(),
  end: vi.fn(),
};

const mockBlob = {
  name: 'test-file-uuid',
  createWriteStream: vi.fn(() => mockBlobStream),
};

const mockBucket = {
  name: 'test-bucket',
  file: vi.fn(() => mockBlob),
};

vi.mock('../storage', () => ({
  bucket: mockBucket,
}));

vi.mock('uuid', () => ({
  v4: vi.fn(() => 'test-uuid-1234'),
}));

// Mock multer
vi.mock('multer', () => {
  const mockMemoryStorage = vi.fn(() => ({}));
  const mockMulter: any = vi.fn(() => ({
    single: vi.fn(),
  }));
  mockMulter.memoryStorage = mockMemoryStorage;
  return {
    default: mockMulter,
  };
});

describe('upload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('upload middleware', () => {
    it('should export upload middleware', async () => {
      const { upload } = await import('../upload');

      expect(upload).toBeDefined();
      expect(upload.single).toBeDefined();
      expect(typeof upload.single).toBe('function');
    });
  });
});

//   mockBlobStream.on.mockReturnThis();
// describe('uploadImageToGCS', () => {
//     it('should upload image successfully', async () => {
//       // Import after mocks are set up
//       const { uploadImageToGCS } = await import('../upload');

//       const mockFile = {
//         fieldname: 'image',
//         originalname: 'test.jpg',
//         encoding: '7bit',
//         mimetype: 'image/jpeg',
//         buffer: Buffer.from('test-image-data'),
//         size: 1024,
//       };

//       // Setup the mock to simulate successful upload
//       mockBlobStream.on.mockImplementation((event: string, handler: () => void) => {
//         if (event === 'finish') {
//           // Call the finish handler immediately
//           setImmediate(() => handler());
//         }
//         return mockBlobStream;
//       });

//       const result = await uploadImageToGCS(mockFile);

//       expect(result).toBe('https://storage.googleapis.com/test-bucket/test-file-uuid');
//       expect(mockBucket.file).toHaveBeenCalledWith('test-uuid-1234');
//       expect(mockBlob.createWriteStream).toHaveBeenCalledWith({
//         resumable: false,
//         contentType: 'image/jpeg',
//       });
//       expect(mockBlobStream.end).toHaveBeenCalledWith(mockFile.buffer);
//     });

//     it('should reject if upload fails', async () => {
//       const { uploadImageToGCS } = await import('../upload');

//       const mockFile = {
//         fieldname: 'image',
//         originalname: 'test.jpg',
//         encoding: '7bit',
//         mimetype: 'image/jpeg',
//         buffer: Buffer.from('test-image-data'),
//         size: 1024,
//       };

//       const uploadError = new Error('Upload failed');

//       // Setup the mock to simulate error
//       mockBlobStream.on.mockImplementation((event: string, handler: (err: Error) => void) => {
//         if (event === 'error') {
//           setImmediate(() => handler(uploadError));
//         }
//         return mockBlobStream;
//       });

//       await expect(uploadImageToGCS(mockFile)).rejects.toThrow('Upload failed');
//     });

//     it('should handle different file types', async () => {
//       const { uploadImageToGCS } = await import('../upload');

//       const mockFile = {
//         fieldname: 'image',
//         originalname: 'test.png',
//         encoding: '7bit',
//         mimetype: 'image/png',
//         buffer: Buffer.from('test-png-data'),
//         size: 2048,
//       };

//       mockBlobStream.on.mockImplementation((event: string, handler: () => void) => {
//         if (event === 'finish') {
//           setImmediate(() => handler());
//         }
//         return mockBlobStream;
//       });

//       const result = await uploadImageToGCS(mockFile);

//       expect(mockBlob.createWriteStream).toHaveBeenCalledWith({
//         resumable: false,
//         contentType: 'image/png',
//       });
//       expect(result).toBeTruthy();
//     });

//     it('should use uuid for file name', async () => {
//       const { uploadImageToGCS } = await import('../upload');

//       const mockFile = {
//         fieldname: 'image',
//         originalname: 'original-name.jpg',
//         encoding: '7bit',
//         mimetype: 'image/jpeg',
//         buffer: Buffer.from('test-data'),
//         size: 512,
//       };

//       mockBlobStream.on.mockImplementation((event: string, handler: () => void) => {
//         if (event === 'finish') {
//           setImmediate(() => handler());
//         }
//         return mockBlobStream;
//       });

//       await uploadImageToGCS(mockFile);

//       // Should use uuid, not original filename
//       expect(mockBucket.file).toHaveBeenCalledWith('test-uuid-1234');
//     });
//   });
