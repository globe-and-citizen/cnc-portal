import { beforeEach, describe, expect, it, vi } from 'vitest';
import { extractProfileStorageKey, resolveStorageImageUrl } from '../profileImage.util';

const { mockGetPresignedDownloadUrl } = vi.hoisted(() => ({
  mockGetPresignedDownloadUrl: vi.fn((key: string) => `https://signed.example.com/${key}`),
}));

vi.mock('../../services/storageService', () => ({
  getPresignedDownloadUrl: mockGetPresignedDownloadUrl,
}));

describe('profileImage.util', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('extractProfileStorageKey', () => {
    it('returns null for empty or non-string input', () => {
      expect(extractProfileStorageKey(undefined)).toBeNull();
      expect(extractProfileStorageKey(null)).toBeNull();
      expect(extractProfileStorageKey('')).toBeNull();
      expect(extractProfileStorageKey({ malformed: true } as unknown as string)).toBeNull();
    });

   
    it('extracts encoded key from signed URL', () => {
      expect(
        extractProfileStorageKey(
          'https://storage.railway.app/bucket/uploads%2Fmember%2Freceipt.png?X-Amz-Signature=old'
        )
      ).toBe('uploads/member/receipt.png');
    });

   
  });

  describe('resolveStorageImageUrl', () => {
    it('returns input for falsy values', async () => {
      await expect(resolveStorageImageUrl(undefined)).resolves.toBeUndefined();
      await expect(resolveStorageImageUrl(null)).resolves.toBeNull();
      await expect(resolveStorageImageUrl('')).resolves.toBe('');
    });

    it('returns input unchanged when key cannot be extracted', async () => {
      await expect(resolveStorageImageUrl('https://example.com/avatar.png')).resolves.toBe(
        'https://example.com/avatar.png'
      );
    });


    it('returns original input when presign fails', async () => {
      mockGetPresignedDownloadUrl.mockRejectedValueOnce(new Error('presign failed'));

      await expect(resolveStorageImageUrl('profiles/0xabc/avatar.png')).resolves.toBe(
        'profiles/0xabc/avatar.png'
      );
    });
  });
});
