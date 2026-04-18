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
