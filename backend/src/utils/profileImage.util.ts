import { getPresignedDownloadUrl } from '../services/storageService';

export const extractProfileStorageKey = (imageUrl?: string | null): string | null => {
  if (!imageUrl || typeof imageUrl !== 'string') {
    return null;
  }

  if (imageUrl.startsWith('profiles/') || imageUrl.startsWith('uploads/')) {
    return imageUrl;
  }

  const decodedUrl = decodeURIComponent(imageUrl);
  const storageKeyMatch = decodedUrl.match(/(profiles|uploads)\/[^?#]+/);
  return storageKeyMatch ? storageKeyMatch[0] : null;
};

export const resolveStorageImageUrl = async (
  imageUrl?: string | null
): Promise<string | null | undefined> => {
  if (!imageUrl) {
    return imageUrl;
  }

  const key = extractProfileStorageKey(imageUrl);
  if (!key) {
    return imageUrl;
  }

  try {
    return await getPresignedDownloadUrl(key, 86400 * 7);
  } catch {
    return imageUrl;
  }
};
