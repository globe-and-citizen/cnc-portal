-- Pre-check: fail with a clear message if any (teamId, userAddress) already
-- has multiple active wages (nextWageId IS NULL). Without this guard the
-- CREATE UNIQUE INDEX below would fail with a generic duplicate-key error and
-- leave the migration partially applied.
DO $$
DECLARE
  duplicate_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO duplicate_count FROM (
    SELECT 1
    FROM "Wage"
    WHERE "nextWageId" IS NULL
    GROUP BY "teamId", "userAddress"
    HAVING COUNT(*) > 1
  ) dup;

  IF duplicate_count > 0 THEN
    RAISE EXCEPTION
      'Cannot apply partial unique index: % (teamId, userAddress) pairs have multiple active wages (nextWageId IS NULL). Resolve the duplicates before re-running this migration.',
      duplicate_count;
  END IF;
END $$;

-- Drop the existing unique constraint which does not prevent multiple "active"
-- wages per (teamId, userAddress) because Postgres treats NULLs as distinct in
-- multi-column uniques.
DROP INDEX IF EXISTS "Wage_teamId_userAddress_nextWageId_key";

-- Partial unique index: at most one wage per (teamId, userAddress) may have
-- nextWageId IS NULL (i.e. at most one "active" wage per user per team).
-- Historical wages (nextWageId IS NOT NULL) remain unconstrained by this index;
-- chain integrity is still enforced by the @unique on Wage.nextWageId.
CREATE UNIQUE INDEX "Wage_teamId_userAddress_active_key"
  ON "Wage" ("teamId", "userAddress")
  WHERE "nextWageId" IS NULL;

-- Missing indexes that back common filters.
CREATE INDEX "Notification_userAddress_idx" ON "Notification" ("userAddress");
CREATE INDEX "WeeklyClaim_weekStart_idx"    ON "WeeklyClaim"  ("weekStart");
