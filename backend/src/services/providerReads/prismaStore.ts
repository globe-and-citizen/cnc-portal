import { Prisma, PrismaClient } from '@prisma/client';
import { ProviderReadError, ProviderReadStore } from './store';

interface BudgetRow {
  now: Date;
  nextRequestAt: Date;
  blockedUntil: Date | null;
  leaseUntil: Date | null;
}

export class PrismaProviderReadStore implements ProviderReadStore {
  constructor(private readonly db: PrismaClient) {}

  async find(key: string) {
    return this.db.providerReadCache.findUnique({
      where: { key },
      select: { payload: true, expiresAt: true },
    });
  }

  async claim(key: string, token: string, now: Date, until: Date) {
    await this.db.$executeRaw`
      INSERT INTO "ProviderReadCache" ("key", "updatedAt") VALUES (${key}, CURRENT_TIMESTAMP)
      ON CONFLICT ("key") DO NOTHING
    `;
    const result = await this.db.providerReadCache.updateMany({
      where: { key, OR: [{ leaseUntil: null }, { leaseUntil: { lte: now } }] },
      data: { leaseToken: token, leaseUntil: until },
    });
    return result.count === 1;
  }

  async save(key: string, token: string, payload: unknown, expiresAt: Date) {
    const serialized = JSON.parse(JSON.stringify(payload)) as Prisma.InputJsonValue;
    const result = await this.db.providerReadCache.updateMany({
      where: { key, leaseToken: token },
      data: { payload: serialized, expiresAt, leaseToken: null, leaseUntil: null },
    });
    if (result.count !== 1) throw new ProviderReadError(503, 1, 'cache-lease-expired');
  }

  async release(key: string, token: string) {
    await this.db.providerReadCache.updateMany({
      where: { key, leaseToken: token },
      data: { leaseToken: null, leaseUntil: null },
    });
  }

  async expire(prefix: string, safeAddress?: string) {
    await this.db.providerReadCache.updateMany({
      where: {
        key: { startsWith: prefix },
        ...(safeAddress
          ? {
              OR: [
                { payload: { path: ['body', 'safe'], equals: safeAddress } },
                { payload: { path: ['body', 'safe'], equals: safeAddress.toLowerCase() } },
              ],
            }
          : {}),
      },
      data: { expiresAt: new Date(0), leaseToken: null, leaseUntil: null },
    });
  }

  async permit(provider: string, token: string, _now: Date, gapMs: number) {
    return this.db.$transaction(async (tx) => {
      await tx.$executeRaw`
        INSERT INTO "ProviderReadBudget" ("provider") VALUES (${provider})
        ON CONFLICT ("provider") DO NOTHING
      `;
      const [row] = await tx.$queryRaw<BudgetRow[]>`
        SELECT clock_timestamp() AS "now", "nextRequestAt", "blockedUntil", "leaseUntil"
        FROM "ProviderReadBudget" WHERE "provider" = ${provider} FOR UPDATE
      `;
      const now = row.now;
      if (row.blockedUntil && row.blockedUntil > now) {
        throw new ProviderReadError(
          429,
          Math.ceil((row.blockedUntil.getTime() - now.getTime()) / 1000),
          'provider-cooldown'
        );
      }
      if (row.leaseUntil && row.leaseUntil > now) return 250;
      const delay = row.nextRequestAt.getTime() - now.getTime();
      if (delay > 0) return delay;
      await tx.providerReadBudget.update({
        where: { provider },
        data: {
          leaseToken: token,
          leaseUntil: new Date(now.getTime() + 20_000),
          nextRequestAt: new Date(now.getTime() + gapMs),
          requestCount: { increment: 1 },
          lastRequestAt: now,
        },
      });
      return 0;
    });
  }

  async finish(provider: string, token: string) {
    await this.db.providerReadBudget.updateMany({
      where: { provider, leaseToken: token },
      data: { leaseToken: null, leaseUntil: null },
    });
  }

  async block(provider: string, until: Date) {
    await this.db.providerReadBudget.updateMany({
      where: { provider, OR: [{ blockedUntil: null }, { blockedUntil: { lt: until } }] },
      data: { blockedUntil: until, limitedCount: { increment: 1 } },
    });
  }
}
