-- Do not merge legacy duplicate rows automatically. Different rows can carry
-- different daily claims, goals, signatures, or terminal states, and choosing
-- one would silently discard product data. Stop before changing any constraint
-- so duplicates can be reconciled explicitly with the affected team.
DO $$
DECLARE
  duplicate_group_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO duplicate_group_count
  FROM (
    SELECT 1
    FROM "WeeklyClaim"
    GROUP BY "teamId", "memberAddress", "weekStart"
    HAVING COUNT(*) > 1
  ) duplicate_groups;

  IF duplicate_group_count > 0 THEN
    RAISE EXCEPTION
      'Cannot enforce one weekly claim per member and week: % duplicate member-week groups exist. Reconcile their daily claims, goals, signatures, and terminal statuses explicitly before re-running this migration.',
      duplicate_group_count;
  END IF;
END $$;

-- Replace the former wage-week key with the product invariant. The new index
-- lets concurrent claim and goals creation converge on the same weekly row.
DROP INDEX IF EXISTS "WeeklyClaim_wageId_weekStart_key";
CREATE UNIQUE INDEX "WeeklyClaim_teamId_memberAddress_weekStart_key"
  ON "WeeklyClaim"("teamId", "memberAddress", "weekStart");

-- Wage versions are current as soon as they are saved. Remove the scheduling
-- timestamp so no API or client path can expose a delayed effective date.
ALTER TABLE "Wage" DROP COLUMN "effectiveFrom";
