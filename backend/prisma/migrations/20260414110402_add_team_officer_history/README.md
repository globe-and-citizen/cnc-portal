# Migration: add_team_officer_history

## What it does

Adds a `TeamOfficer` table to track the history of Officer contracts deployed per team, and links existing `TeamContract` rows to their Officer via a new nullable `officerId` column.

Before this migration, a team had a single `Team.officerAddress` pointing to its current Officer contract, with no history. After this migration:

- Every Officer deployed under a team is recorded as a `TeamOfficer` row.
- Each `TeamContract` (except `Safe` and `SafeDepositRouter`) is linked to the `TeamOfficer` it was deployed under.
- Redeploying an Officer no longer destroys prior state — the old `TeamOfficer` and its contracts stay in place, and `Team.officerAddress` simply moves to the new one.

## Impact on existing production data

The migration includes a **backfill** at the end of `migration.sql`:

1. For every `Team` where `officerAddress IS NOT NULL`, insert one `TeamOfficer` row with:
   - `address` := `Team.officerAddress`
   - `teamId` := `Team.id`
   - `deployer` := `Team.ownerAddress` (best approximation — the real deployer was never recorded)
   - `createdAt` := `Team.createdAt` (best approximation of deployment age)
   - `deployBlockNumber` := `NULL` (never captured for historical Officers)
   - `deployedAt` := `NULL` (idem)
2. For every existing `TeamContract` whose `type` is **not** `Safe` or `SafeDepositRouter`, set `officerId` to the id of the `TeamOfficer` matching its team's current `officerAddress`.

### Rows NOT touched by the backfill

- `TeamContract` of type `Safe` / `SafeDepositRouter` — Safe contracts are deployed independently of the Officer beacon system and never belong to a generation. Their `officerId` stays `NULL`.
- `TeamContract` whose team has `officerAddress = NULL` — orphans. Their `officerId` stays `NULL`. Acceptable: these contracts predate any known Officer on their team.

### Idempotency

- The `INSERT` uses `ON CONFLICT ("address") DO NOTHING`, safe to retry.
- The `UPDATE` is idempotent by nature (same row, same target).

## Production deploy checklist

1. **Snapshot the production database** before deploying (standard precaution for any schema change).
2. **Deploy the new backend code** containing this migration. Prisma will run `migrate deploy` as part of the normal release process, which applies `migration.sql` (DDL + backfill) in a single transaction.
3. **Run the verification queries below** against production once the migration has applied. All three must return 0 rows / 0 count.
4. If a verification query fails, **do not roll back automatically** — investigate first. The likely cause is a data edge case the backfill did not anticipate; a targeted SQL fix is usually simpler than a rollback.

## Verification queries

Run these against the production database after the migration applies.

```sql
-- (1) Every team with an officerAddress must have exactly 1 TeamOfficer row.
SELECT t."id", t."officerAddress", COUNT(o.*)
FROM "Team" t
LEFT JOIN "TeamOfficer" o
  ON o."teamId" = t."id" AND o."address" = t."officerAddress"
WHERE t."officerAddress" IS NOT NULL
GROUP BY t."id", t."officerAddress"
HAVING COUNT(o.*) != 1;
-- Expected: 0 rows

-- (2) Every non-Safe TeamContract whose team has an officerAddress
--     must be linked to a TeamOfficer.
SELECT tc."id", tc."type", tc."teamId"
FROM "TeamContract" tc
JOIN "Team" t ON t."id" = tc."teamId"
WHERE tc."officerId" IS NULL
  AND t."officerAddress" IS NOT NULL
  AND tc."type" NOT IN ('Safe', 'SafeDepositRouter');
-- Expected: 0 rows

-- (3) Safe contracts must remain unlinked.
SELECT COUNT(*) FROM "TeamContract"
WHERE "type" IN ('Safe', 'SafeDepositRouter') AND "officerId" IS NOT NULL;
-- Expected: 0
```

## Rollback

This migration is not automatically reversible through Prisma. If a manual rollback is required in production:

```sql
BEGIN;
ALTER TABLE "TeamContract" DROP CONSTRAINT "TeamContract_officerId_fkey";
DROP INDEX "TeamContract_officerId_idx";
ALTER TABLE "TeamContract" DROP COLUMN "officerId";
DROP TABLE "TeamOfficer";
DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20260414110402_add_team_officer_history';
COMMIT;
```

Note: the rollback loses the `officerId` links on any `TeamContract` rows created after the migration applied. Only the original `Team.officerAddress` pointer would remain as source of truth, which matches the pre-migration behavior.

## Follow-up work (not part of this migration)

The migration adds the schema but does not yet:

- Populate `deployBlockNumber` / `deployedAt` — these stay `NULL` until `syncContracts` is updated to accept and store them.
- Expose a listing endpoint (`GET /teams/:id/officers`).
- Remove `resetTeamContracts`, which becomes obsolete once the history model is in use.

These are tracked separately.
