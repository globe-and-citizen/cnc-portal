import { Request, Response } from 'express';
import { Address } from 'viem';
import { prisma } from '../utils';
import { OfficerVersionSource, resolveOfficerVersion } from '../utils/officerVersion';
import publicClient from '../utils/viem.config';
import { errorResponse } from '../utils/utils';
import { syncOfficerVersionsBodySchema, z } from '../validation';

type SyncOfficerVersionsBody = z.infer<typeof syncOfficerVersionsBodySchema>;

// `TeamOfficer.version` has been write-once since it was introduced, so the
// column accumulated whatever vocabulary was in fashion when each row was
// created ('legacy', 'v0.10', 'V1', '2.0.0'). Resolving every Officer against
// the chain realigns them all on one semver scale.
type SyncStatus = 'updated' | 'unchanged' | 'unresolved';

interface OfficerVersionResult {
  officerId: number;
  teamId: number;
  teamName: string;
  address: string;
  isCurrent: boolean;
  from: string | null;
  to: string | null;
  source: OfficerVersionSource | null;
  status: SyncStatus;
}

// Officers are resolved a few at a time: each one costs up to two RPC round
// trips, and firing the whole table at a public endpoint gets us rate-limited.
const RPC_CONCURRENCY = 5;

const mapWithConcurrency = async <T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> => {
  const results = new Array<R>(items.length);
  let cursor = 0;

  const worker = async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await fn(items[index]);
    }
  };

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
};

/**
 * POST /admin/officer-versions/sync
 *
 * Walks every TeamOfficer row — historical generations included, since the
 * dashboard shows a version badge per generation — re-detects the contract
 * generation on-chain and rewrites `version` with the resolved semver.
 *
 * Officers whose generation can't be resolved are reported and left untouched:
 * overwriting a stored tag with a guess would lose information.
 */
export const syncOfficerVersions = async (req: Request, res: Response) => {
  const { dryRun = false } = req.body as SyncOfficerVersionsBody;

  try {
    const officers = await prisma.teamOfficer.findMany({
      include: {
        team: { select: { name: true } },
        nextOfficer: { select: { id: true } },
      },
      orderBy: [{ teamId: 'asc' }, { id: 'asc' }],
    });

    const results = await mapWithConcurrency(officers, RPC_CONCURRENCY, async (officer) => {
      const { version, source } = await resolveOfficerVersion(officer.address as Address);
      const status: SyncStatus = !version
        ? 'unresolved'
        : version === officer.version
          ? 'unchanged'
          : 'updated';

      return {
        officerId: officer.id,
        teamId: officer.teamId,
        teamName: officer.team.name,
        address: officer.address,
        isCurrent: officer.nextOfficer === null,
        from: officer.version,
        to: version,
        source,
        status,
      } satisfies OfficerVersionResult;
    });

    const toUpdate = results.filter((result) => result.status === 'updated');

    if (!dryRun && toUpdate.length > 0) {
      // One statement per distinct target version rather than one per row —
      // there are only ever a handful of generations.
      const idsByVersion = new Map<string, number[]>();
      for (const result of toUpdate) {
        const ids = idsByVersion.get(result.to!) ?? [];
        ids.push(result.officerId);
        idsByVersion.set(result.to!, ids);
      }

      for (const [version, ids] of idsByVersion) {
        await prisma.teamOfficer.updateMany({ where: { id: { in: ids } }, data: { version } });
      }
    }

    return res.status(200).json({
      chainId: publicClient.chain?.id ?? null,
      dryRun,
      scanned: results.length,
      updated: toUpdate.length,
      unchanged: results.filter((result) => result.status === 'unchanged').length,
      unresolved: results.filter((result) => result.status === 'unresolved').length,
      results,
    });
  } catch (error) {
    return errorResponse(500, error, res);
  }
};
