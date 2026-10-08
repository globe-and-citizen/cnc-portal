/** Opt-in real PostgreSQL proof; exclusively uses a generated schema on a local disposable database. */
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { PrismaProviderReadStore } from '../prismaStore';
import { ProviderReadGateway } from '../gateway';

const configured = process.env.PROVIDER_TEST_DATABASE_URL;
const schema = `provider_reads_test_${randomUUID().replaceAll('-', '')}`;

describe.skipIf(!configured)('PostgreSQL provider coordination migration', () => {
  let admin: PrismaClient;
  let first: PrismaClient;
  let second: PrismaClient;
  let created = false;
  beforeAll(async () => {
    const url = new URL(configured!);
    if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))
      throw new Error('A local disposable test database is required');
    admin = new PrismaClient({ datasources: { db: { url: url.href } } });
    await admin.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
    created = true;
    url.searchParams.set('schema', schema);
    first = new PrismaClient({ datasources: { db: { url: url.href } } });
    second = new PrismaClient({ datasources: { db: { url: url.href } } });
    const migration = readFileSync(
      'prisma/migrations/20261007150000_provider_read_coordination/migration.sql',
      'utf8'
    );
    for (const statement of migration.split(';').filter((item) => item.trim()))
      await first.$executeRawUnsafe(statement);
  });
  afterAll(async () => {
    await first?.$disconnect();
    await second?.$disconnect();
    if (admin && created && /^provider_reads_test_[0-9a-f]{32}$/.test(schema)) {
      await admin.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);
      await admin.$disconnect();
    }
  });

  it('uses atomic resource leases and shares cache data between independent database clients', async () => {
    const one = new PrismaProviderReadStore(first);
    const two = new PrismaProviderReadStore(second);
    const now = new Date();
    const until = new Date(now.getTime() + 30_000);
    const grants = await Promise.all([
      one.claim('resource', 'one', now, until),
      two.claim('resource', 'two', now, until),
    ]);
    expect(grants.filter(Boolean)).toHaveLength(1);
    const winner = grants[0] ? one : two;
    await winner.save('resource', grants[0] ? 'one' : 'two', { complete: true }, until);
    expect((await two.find('resource'))?.payload).toEqual({ complete: true });
    await one.expire('resource');
    expect((await two.find('resource'))?.expiresAt).toEqual(new Date(0));
  });

  it('serializes provider grants across processes and propagates cooldowns', async () => {
    const one = new PrismaProviderReadStore(first);
    const two = new PrismaProviderReadStore(second);
    const grants = await Promise.all([
      one.permit('budget-test', 'one', new Date(), 1000),
      two.permit('budget-test', 'two', new Date(), 1000),
    ]);
    expect(grants.filter((delay) => delay === 0)).toHaveLength(1);
    await one.block('budget-test', new Date(Date.now() + 60_000));
    await expect(two.permit('budget-test', 'later', new Date(), 1000)).rejects.toMatchObject({
      status: 429,
    });
  });

  it('performs one upstream read for concurrent clients and reuses the persisted result after a gateway restart', async () => {
    const fetcher = vi.fn(async () => new Response('{"value":42}'));
    const one = new ProviderReadGateway(new PrismaProviderReadStore(first), fetcher);
    const two = new ProviderReadGateway(new PrismaProviderReadStore(second), fetcher);
    const request = {
      provider: 'safe' as const,
      url: new URL('https://api.safe.global/shared-read-proof'),
    };
    expect(await Promise.all([one.json(request, 60_000), two.json(request, 60_000)])).toEqual([
      { value: 42 },
      { value: 42 },
    ]);
    expect(
      await new ProviderReadGateway(new PrismaProviderReadStore(second), fetcher).json(
        request,
        60_000
      )
    ).toEqual({ value: 42 });
    expect(fetcher).toHaveBeenCalledOnce();
    expect(
      (await first.providerReadBudget.findUnique({ where: { provider: 'safe' } }))?.requestCount
    ).toBe(1);
  });
});
