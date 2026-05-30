import { getPresignedDownloadUrl } from '../services/storageService';
// import { faker } from '@faker-js/faker';

// Profile avatars sit behind presigned URLs; we use a 7-day TTL so most
// page loads hit the same signed URL and benefit from CDN/browser caching.
const PROFILE_IMAGE_URL_TTL_SECONDS = 7 * 24 * 60 * 60;

type AvatarMode = 'faker' | 'none';

const resolveAvatarMode = (): AvatarMode => {
  const mode = (process.env.PROFILE_AVATAR_MODE ?? 'faker').toLowerCase();
  if (mode === 'none') {
    return 'none';
  }
  return 'faker';
};

// const generateFakerAvatar = (address: string): string => {
//   const seed = Array.from(address).reduce((sum, char) => sum + char.charCodeAt(0), 0);
//   faker.seed(seed);
//   return faker.image.avatar();
// };

const generateSeedAvatar = (address: string): string => {
  const seed = encodeURIComponent(address);
  return `https://api.dicebear.com/7.x/identicon/svg?seed=${seed}`;
};

export const resolveDefaultProfileImageUrl = (address: string): string | null => {
  if (resolveAvatarMode() !== 'faker') {
    return null;
  }

  return generateSeedAvatar(address);
};

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
    return await getPresignedDownloadUrl(key, PROFILE_IMAGE_URL_TTL_SECONDS);
  } catch {
    return imageUrl;
  }
};
