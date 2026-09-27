import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PrismaClient, type Prisma } from '@prisma/client';
import { parse } from 'dotenv';
import { afterAll, describe, expect, it } from 'vitest';

const environment = existsSync(resolve('.env')) ? parse(readFileSync(resolve('.env'))) : {};
const databaseUrl = process.env.PAYROLL_TEST_DATABASE_URL ?? environment.DATABASE_URL;
if (!databaseUrl || !['localhost', '127.0.0.1', '::1'].includes(new URL(databaseUrl).hostname)) {
  throw new Error(
    'Payroll database tests require a local PostgreSQL URL. Set PAYROLL_TEST_DATABASE_URL.'
  );
}
const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
const migration = readFileSync(
  resolve('prisma/migrations/20260823194500_enforce_member_weekly_claim_uniqueness/migration.sql'),
  'utf8'
);
const guard = migration.match(/DO \$\$[\s\S]*?END \$\$;/)?.[0];
if (!guard) throw new Error('Expected the duplicate-preservation migration guard');
const statements = migration
  .slice(migration.indexOf(guard) + guard.length)
  .replace(/--[^\n]*/g, '')
  .split(';')
  .map((sql) => sql.trim())
  .filter(Boolean);
const rolledBack = new Error('Rollback isolated Payroll test schema');

async function isolatedDatabase(assertions: (tx: Prisma.TransactionClient) => Promise<void>) {
  try {
    await prisma.$transaction(
      async (tx) => {
        const schema = `payroll_test_${randomUUID().replaceAll('-', '')}`;
        await tx.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
        await tx.$executeRawUnsafe(`SET LOCAL search_path TO "${schema}"`);
        await tx.$executeRawUnsafe(
          'CREATE TABLE "Wage" (id integer PRIMARY KEY, "effectiveFrom" timestamp)'
        );
        await tx.$executeRawUnsafe(`CREATE TABLE "WeeklyClaim" (
        id integer PRIMARY KEY, "teamId" integer, "memberAddress" text, "weekStart" timestamp,
        "wageId" integer, "weeklyGoals" text, signature text, status text)`);
        await tx.$executeRawUnsafe(
          'CREATE UNIQUE INDEX "WeeklyClaim_wageId_weekStart_key" ON "WeeklyClaim"("wageId", "weekStart")'
        );
        await tx.$executeRawUnsafe(
          'CREATE TABLE "Claim" (id integer PRIMARY KEY, "weeklyClaimId" integer REFERENCES "WeeklyClaim"(id), memo text)'
        );
        await assertions(tx);
        throw rolledBack;
      },
      { timeout: 30_000 }
    );
  } catch (error) {
    if (error !== rolledBack) throw error;
  }
}

async function applyMigration(tx: Prisma.TransactionClient) {
  await tx.$executeRawUnsafe(guard!);
  for (const statement of statements) await tx.$executeRawUnsafe(statement);
}

afterAll(async () => {
  await prisma.$disconnect();
});

describe('Payroll uniqueness migration on real PostgreSQL', () => {
  it('[AC-US-PAYROLL-001-18] enforces company/member/week uniqueness across different wage versions', async () => {
    await isolatedDatabase(async (tx) => {
      await applyMigration(tx);
      await tx.$executeRawUnsafe(`INSERT INTO "WeeklyClaim" (id,"teamId","memberAddress","weekStart","wageId")
        VALUES (1,1,'member','2026-09-21',1)`);
      await tx.$executeRawUnsafe('SAVEPOINT duplicate_attempt');
      await expect(
        tx.$executeRawUnsafe(`INSERT INTO "WeeklyClaim" (id,"teamId","memberAddress","weekStart","wageId")
        VALUES (2,1,'member','2026-09-21',2)`)
      ).rejects.toMatchObject({ meta: { code: '23505' } });
      await tx.$executeRawUnsafe('ROLLBACK TO SAVEPOINT duplicate_attempt');
      await tx.$executeRawUnsafe(`INSERT INTO "WeeklyClaim" (id,"teamId","memberAddress","weekStart","wageId") VALUES
        (3,2,'member','2026-09-21',2),(4,1,'other','2026-09-21',3),(5,1,'member','2026-09-28',4)`);
      const rows = await tx.$queryRawUnsafe<Array<{ count: bigint }>>(
        'SELECT COUNT(*) AS count FROM "WeeklyClaim"'
      );
      expect(rows[0].count).toBe(4n);
    });
  });

  it('[AC-US-PAYROLL-001-19] stops on legacy duplicates and preserves claims, goals, signatures and terminal states', async () => {
    await isolatedDatabase(async (tx) => {
      await tx.$executeRawUnsafe(`INSERT INTO "WeeklyClaim" VALUES
        (1,1,'member','2026-09-21',1,'first goals','0xabc','signed'),
        (2,1,'member','2026-09-21',2,'second goals','0xdef','withdrawn')`);
      await tx.$executeRawUnsafe(
        `INSERT INTO "Claim" VALUES (1,1,'first work'),(2,2,'second work')`
      );
      const weeklyBefore = await tx.$queryRawUnsafe('SELECT * FROM "WeeklyClaim" ORDER BY id');
      const dailyBefore = await tx.$queryRawUnsafe('SELECT * FROM "Claim" ORDER BY id');
      await tx.$executeRawUnsafe('SAVEPOINT migration_attempt');
      await expect(applyMigration(tx)).rejects.toThrow(
        /Reconcile their daily claims, goals, signatures, and terminal statuses explicitly/
      );
      await tx.$executeRawUnsafe('ROLLBACK TO SAVEPOINT migration_attempt');
      expect(await tx.$queryRawUnsafe('SELECT * FROM "WeeklyClaim" ORDER BY id')).toEqual(
        weeklyBefore
      );
      expect(await tx.$queryRawUnsafe('SELECT * FROM "Claim" ORDER BY id')).toEqual(dailyBefore);
      const indexes = await tx.$queryRawUnsafe<Array<{ indexname: string }>>(
        'SELECT indexname FROM pg_indexes WHERE schemaname = current_schema()'
      );
      expect(indexes.map((index) => index.indexname)).toContain('WeeklyClaim_wageId_weekStart_key');
      expect(indexes.map((index) => index.indexname)).not.toContain(
        'WeeklyClaim_teamId_memberAddress_weekStart_key'
      );
    });
  });
});
