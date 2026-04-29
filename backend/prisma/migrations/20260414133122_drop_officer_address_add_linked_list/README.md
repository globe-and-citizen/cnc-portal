# Migration: drop_officer_address_add_linked_list

## What it does

Replaces the denormalized `Team.officerAddress` column with a linked list on `TeamOfficer`. After this migration, the **current Officer** for a team is derived from the linked list — it is the row whose `nextOfficer` is null (no successor exists yet).

- **Adds** `TeamOfficer.previousOfficerId` (INTEGER, nullable, unique, FK → `TeamOfficer.id`). Each row points back to its predecessor. The unique constraint enforces that each officer has at most one direct successor (chain, not tree).
- **Drops** `Team.officerAddress`. The single source of truth for "which Officer is currently active for this team" is now the linked list head.

## Impact on existing production data

- **No backfill needed for `previousOfficerId`.** At the time the previous migration `20260414110402_add_team_officer_history` ran, exactly one `TeamOfficer` row was created per team (whichever Officer that team had at the time). Since no team has had an Officer redeploy yet, every existing `TeamOfficer` is the head of its (one-element) chain. `previousOfficerId` stays NULL for all rows.
- **Dropping `Team.officerAddress`** loses no information: every team that had a non-null `officerAddress` already has a corresponding `TeamOfficer` row from the previous migration, so the address is preserved on the `TeamOfficer` side.
- **API consumers** that previously read `team.officerAddress` from the backend must now read `team.currentOfficer.address`. The backend serializes `currentOfficer` (the linked list head) on every team read.

### Rows NOT touched

- `TeamContract` rows are unchanged. Their existing `officerId` link still points to the right `TeamOfficer`.

### Idempotency

Plain DDL — re-applying would fail on the second run (column already dropped, FK already exists). Use `prisma migrate deploy` which tracks applied migrations.

## Production deploy checklist

1. **Snapshot the production database** before deploying.
2. **Deploy the new backend code** containing this migration. `prisma migrate deploy` runs the migration as part of the release.
3. **Run the verification queries below**.
4. The frontend release must ship in the same window — clients that still call the old API expecting `team.officerAddress` will see the field disappear.

## Verification queries

Run these against production after the migration applies.

```sql
-- (1) The Team.officerAddress column should no longer exist.
SELECT column_name FROM information_schema.columns
WHERE table_name = 'Team' AND column_name = 'officerAddress';
-- Expected: 0 rows

-- (2) Every team must have either zero TeamOfficers (never deployed)
--     or exactly one head (a TeamOfficer with no successor pointing back at it).
SELECT t."id", COUNT(o.*) FILTER (WHERE NOT EXISTS (
  SELECT 1 FROM "TeamOfficer" succ WHERE succ."previousOfficerId" = o."id"
)) AS heads
FROM "Team" t
LEFT JOIN "TeamOfficer" o ON o."teamId" = t."id"
GROUP BY t."id"
HAVING COUNT(o.*) FILTER (WHERE NOT EXISTS (
  SELECT 1 FROM "TeamOfficer" succ WHERE succ."previousOfficerId" = o."id"
)) > 1;
-- Expected: 0 rows (no team has more than one head)

-- (3) previousOfficerId never points to a TeamOfficer of a different team.
SELECT child."id", child."teamId", parent."teamId"
FROM "TeamOfficer" child
JOIN "TeamOfficer" parent ON parent."id" = child."previousOfficerId"
WHERE child."teamId" != parent."teamId";
-- Expected: 0 rows
```

## Rollback

```sql
BEGIN;

-- Recreate the denormalized column.
ALTER TABLE "Team" ADD COLUMN "officerAddress" TEXT;

-- Backfill from the linked list heads.
UPDATE "Team" t
SET "officerAddress" = head."address"
FROM "TeamOfficer" head
WHERE head."teamId" = t."id"
  AND NOT EXISTS (
    SELECT 1 FROM "TeamOfficer" succ WHERE succ."previousOfficerId" = head."id"
  );

-- Drop the linked list machinery.
ALTER TABLE "TeamOfficer" DROP CONSTRAINT "TeamOfficer_previousOfficerId_fkey";
DROP INDEX "TeamOfficer_previousOfficerId_key";
ALTER TABLE "TeamOfficer" DROP COLUMN "previousOfficerId";

DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20260414133122_drop_officer_address_add_linked_list';

COMMIT;
```

The rollback is lossless for any team that still has a single linear chain. If multiple Officer redeployments have happened post-migration, the rollback collapses the history (only the current head is preserved in `Team.officerAddress`) — but the `TeamOfficer` archive rows are not deleted, so historical data survives.
