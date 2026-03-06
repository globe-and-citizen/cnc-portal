import { PrismaClient } from '@prisma/client';
import { getPublicFileUrl } from '../src/services/storageService';

type ClaimAttachment = {
  fileType?: string;
  fileSize?: number;
  fileKey?: string;
  fileUrl?: string;
  [key: string]: unknown;
};

const prisma = new PrismaClient();

const hasApplyFlag = process.argv.includes('--apply');
const isDryRun = !hasApplyFlag;

const extractStorageKey = (rawUrl: string | null | undefined): string | null => {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return null;
  }

  if (rawUrl.startsWith('profiles/') || rawUrl.startsWith('uploads/')) {
    return rawUrl;
  }

  const decodedUrl = decodeURIComponent(rawUrl);
  const match = decodedUrl.match(/(profiles|uploads)\/[^?#]+/);
  return match ? match[0] : null;
};

const migrateUserImageUrls = async (): Promise<{ scanned: number; updated: number }> => {
  let scanned = 0;
  let updated = 0;

  const users = await prisma.user.findMany({
    select: {
      address: true,
      imageUrl: true,
    },
    where: {
      imageUrl: {
        not: null,
      },
    },
  });

  scanned = users.length;

  for (const user of users) {
    const key = extractStorageKey(user.imageUrl);
    if (!key) {
      continue;
    }

    const stableUrl = getPublicFileUrl(key);
    if (stableUrl === user.imageUrl) {
      continue;
    }

    updated += 1;
    if (!isDryRun) {
      await prisma.user.update({
        where: { address: user.address },
        data: { imageUrl: stableUrl },
      });
    }
  }

  return { scanned, updated };
};

const normalizeAttachments = (
  attachments: unknown
): { next: unknown; changed: boolean; normalizedCount: number } => {
  if (!Array.isArray(attachments)) {
    return { next: attachments, changed: false, normalizedCount: 0 };
  }

  let changed = false;
  let normalizedCount = 0;

  const next = attachments.map((item) => {
    if (!item || typeof item !== 'object') {
      return item;
    }

    const attachment = item as ClaimAttachment;
    if (!attachment.fileKey || typeof attachment.fileKey !== 'string') {
      return item;
    }

    const stableUrl = getPublicFileUrl(attachment.fileKey);
    if (attachment.fileUrl === stableUrl) {
      return item;
    }

    changed = true;
    normalizedCount += 1;
    return {
      ...attachment,
      fileUrl: stableUrl,
    };
  });

  return { next, changed, normalizedCount };
};

const migrateClaimAttachmentUrls = async (): Promise<{
  scanned: number;
  updatedClaims: number;
  updatedAttachments: number;
}> => {
  const pageSize = 200;
  let cursorId: number | undefined;

  let scanned = 0;
  let updatedClaims = 0;
  let updatedAttachments = 0;

  while (true) {
    const claims = await prisma.claim.findMany({
      take: pageSize,
      orderBy: { id: 'asc' },
      ...(cursorId ? { cursor: { id: cursorId }, skip: 1 } : {}),
      select: {
        id: true,
        fileAttachments: true,
      },
    });

    if (claims.length === 0) {
      break;
    }

    for (const claim of claims) {
      scanned += 1;

      const normalized = normalizeAttachments(claim.fileAttachments);
      if (!normalized.changed) {
        continue;
      }

      updatedClaims += 1;
      updatedAttachments += normalized.normalizedCount;

      if (!isDryRun) {
        await prisma.claim.update({
          where: { id: claim.id },
          data: {
            fileAttachments: normalized.next as object,
          },
        });
      }
    }

    cursorId = claims[claims.length - 1].id;
  }

  return {
    scanned,
    updatedClaims,
    updatedAttachments,
  };
};

async function main() {
  console.log(
    `🛠️ Image URL migration started (${isDryRun ? 'DRY-RUN' : 'APPLY'}) — rewriting legacy signed URLs to stable public URLs`
  );

  await prisma.$connect();

  const userStats = await migrateUserImageUrls();
  const claimStats = await migrateClaimAttachmentUrls();

  console.log('--- Migration summary ---');
  console.log(
    `Users: scanned=${userStats.scanned}, ${isDryRun ? 'wouldUpdate' : 'updated'}=${userStats.updated}`
  );
  console.log(
    `Claims: scanned=${claimStats.scanned}, ${isDryRun ? 'wouldUpdateClaims' : 'updatedClaims'}=${claimStats.updatedClaims}, ${isDryRun ? 'wouldUpdateAttachments' : 'updatedAttachments'}=${claimStats.updatedAttachments}`
  );
  console.log(`Mode: ${isDryRun ? 'No DB writes performed' : 'DB updates committed'}`);

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error('❌ Migration failed:', error);
  await prisma.$disconnect();
  process.exit(1);
});
