import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockGetPresignedDownloadUrl = vi.fn();
const mockDeleteFile = vi.fn();

vi.mock('../storageService', () => ({
  getPresignedDownloadUrl: (...args: unknown[]) => mockGetPresignedDownloadUrl(...args),
  deleteFile: (...args: unknown[]) => mockDeleteFile(...args),
}));

import {
  refreshAttachmentUrls,
  deleteAttachments,
  deleteFileByKey,
  batchRefreshUrls,
  type FileAttachmentData,
} from '../attachmentService';

describe('attachmentService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('refreshAttachmentUrls', () => {
    it('should return empty array as-is', async () => {
      expect(await refreshAttachmentUrls([])).toEqual([]);
    });

    it('should refresh presigned URLs for attachments with fileKey', async () => {
      mockGetPresignedDownloadUrl.mockResolvedValue('https://fresh-url.example.com/file');

      const attachments: FileAttachmentData[] = [
        {
          fileKey: 'uploads/abc123.pdf',
          fileUrl: 'https://old-url.com',
          fileType: 'application/pdf',
          fileSize: 1024,
        },
      ];

      const result = await refreshAttachmentUrls(attachments);

      expect(mockGetPresignedDownloadUrl).toHaveBeenCalledWith('uploads/abc123.pdf');
      expect(result).toEqual([
        {
          fileKey: 'uploads/abc123.pdf',
          fileUrl: 'https://fresh-url.example.com/file',
          fileType: 'application/pdf',
          fileSize: 1024,
        },
      ]);
    });

    it('should handle multiple attachments', async () => {
      mockGetPresignedDownloadUrl
        .mockResolvedValueOnce('https://fresh1.com')
        .mockResolvedValueOnce('https://fresh2.com');

      const attachments: FileAttachmentData[] = [
        {
          fileKey: 'uploads/a.pdf',
          fileUrl: 'https://old1.example.com',
          fileType: 'application/pdf',
          fileSize: 100,
        },
        {
          fileKey: 'uploads/b.png',
          fileUrl: 'https://old2.example.com',
          fileType: 'image/png',
          fileSize: 200,
        },
      ];

      const result = (await refreshAttachmentUrls(attachments)) as FileAttachmentData[];

      expect(result).toHaveLength(2);
      expect(result[0].fileUrl).toBe('https://fresh1.com');
      expect(result[1].fileUrl).toBe('https://fresh2.com');
    });

    it('should skip attachments without fileKey', async () => {
      const attachments = [
        { fileUrl: 'https://some-url.com', fileType: 'image/png', fileSize: 100 },
      ];

      const result = await refreshAttachmentUrls(attachments);

      expect(mockGetPresignedDownloadUrl).not.toHaveBeenCalled();
      expect(result).toEqual(attachments);
    });

    it('should skip null/non-object attachments', async () => {
      const attachments = [null, 'string', 42];

      const result = await refreshAttachmentUrls(attachments);

      expect(mockGetPresignedDownloadUrl).not.toHaveBeenCalled();
      expect(result).toEqual([null, 'string', 42]);
    });

    it('should return original attachment on presigned URL failure', async () => {
      mockGetPresignedDownloadUrl.mockRejectedValue(new Error('S3 error'));

      const attachments: FileAttachmentData[] = [
        {
          fileKey: 'uploads/fail.pdf',
          fileUrl: 'https://old-url.com',
          fileType: 'application/pdf',
          fileSize: 500,
        },
      ];

      const result = await refreshAttachmentUrls(attachments);

      expect(result).toEqual(attachments);
    });
  });

  describe('deleteAttachments', () => {
    it('should do nothing for non-array input', async () => {
      await deleteAttachments(null);
      await deleteAttachments(undefined);
      await deleteAttachments('string');
      expect(mockDeleteFile).not.toHaveBeenCalled();
    });

    it('should do nothing for empty array', async () => {
      await deleteAttachments([]);
      expect(mockDeleteFile).not.toHaveBeenCalled();
    });

    it('should delete files for each attachment with fileKey', async () => {
      mockDeleteFile.mockResolvedValue(true);

      const attachments: FileAttachmentData[] = [
        {
          fileKey: 'uploads/a.pdf',
          fileUrl: 'https://example.com/a.pdf',
          fileType: 'application/pdf',
          fileSize: 100,
        },
        {
          fileKey: 'uploads/b.png',
          fileUrl: 'https://example.com/b.png',
          fileType: 'image/png',
          fileSize: 200,
        },
      ];

      await deleteAttachments(attachments);

      expect(mockDeleteFile).toHaveBeenCalledTimes(2);
      expect(mockDeleteFile).toHaveBeenCalledWith('uploads/a.pdf');
      expect(mockDeleteFile).toHaveBeenCalledWith('uploads/b.png');
    });

    it('should skip attachments with empty or missing fileKey', async () => {
      const attachments = [
        {
          fileKey: '',
          fileUrl: 'https://example.com/a.txt',
          fileType: 'text/plain',
          fileSize: 10,
        },
        { fileUrl: 'https://example.com/b.txt', fileType: 'text/plain', fileSize: 10 },
        null,
        'string',
      ];

      await deleteAttachments(attachments);

      expect(mockDeleteFile).not.toHaveBeenCalled();
    });

    it('should log warning but not throw on delete failure', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      mockDeleteFile.mockRejectedValue(new Error('delete failed'));

      const attachments: FileAttachmentData[] = [
        {
          fileKey: 'uploads/fail.pdf',
          fileUrl: 'https://example.com/fail.pdf',
          fileType: 'application/pdf',
          fileSize: 100,
        },
      ];

      await expect(deleteAttachments(attachments)).resolves.toBeUndefined();
      expect(warnSpy).toHaveBeenCalled();

      warnSpy.mockRestore();
    });
  });

  describe('deleteFileByKey', () => {
    it('should delegate to storageService.deleteFile', async () => {
      mockDeleteFile.mockResolvedValue(true);

      const result = await deleteFileByKey('uploads/test.pdf');

      expect(mockDeleteFile).toHaveBeenCalledWith('uploads/test.pdf');
      expect(result).toBe(true);
    });

    it('should return false and log warning on failure', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      mockDeleteFile.mockRejectedValue(new Error('S3 error'));

      const result = await deleteFileByKey('uploads/fail.pdf');

      expect(result).toBe(false);
      expect(warnSpy).toHaveBeenCalled();

      warnSpy.mockRestore();
    });
  });

  describe('batchRefreshUrls', () => {
    it('should refresh URLs for all provided file keys', async () => {
      mockGetPresignedDownloadUrl
        .mockResolvedValueOnce('https://fresh1.com')
        .mockResolvedValueOnce('https://fresh2.com');

      const result = await batchRefreshUrls(['uploads/a.pdf', 'uploads/b.png']);

      expect(result.refreshed).toHaveLength(2);
      expect(result.errors).toHaveLength(0);
      expect(result.refreshed).toEqual(
        expect.arrayContaining([
          { fileKey: 'uploads/a.pdf', fileUrl: 'https://fresh1.com' },
          { fileKey: 'uploads/b.png', fileUrl: 'https://fresh2.com' },
        ])
      );
    });

    it('should pass expirySeconds to getPresignedDownloadUrl', async () => {
      mockGetPresignedDownloadUrl.mockResolvedValue('https://url.com');

      await batchRefreshUrls(['uploads/a.pdf'], 7200);

      expect(mockGetPresignedDownloadUrl).toHaveBeenCalledWith('uploads/a.pdf', 7200);
    });

    it('should report errors for failed keys without throwing', async () => {
      mockGetPresignedDownloadUrl
        .mockResolvedValueOnce('https://ok.com')
        .mockRejectedValueOnce(new Error('Not found'));

      const result = await batchRefreshUrls(['uploads/ok.pdf', 'uploads/missing.pdf']);

      expect(result.refreshed).toHaveLength(1);
      expect(result.refreshed[0]).toEqual({ fileKey: 'uploads/ok.pdf', fileUrl: 'https://ok.com' });
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toEqual({ fileKey: 'uploads/missing.pdf', error: 'Not found' });
    });

    it('should handle empty array', async () => {
      const result = await batchRefreshUrls([]);

      expect(result.refreshed).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
      expect(mockGetPresignedDownloadUrl).not.toHaveBeenCalled();
    });
  });
});
