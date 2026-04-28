-- Replace the partial unique INDEX on active wages with an equivalent
-- DEFERRABLE EXCLUDE CONSTRAINT. The invariant is unchanged ("at most one
-- wage per (teamId, userAddress) may have nextWageId IS NULL"), but a
-- deferrable constraint allows a transaction to momentarily hold two active
-- rows during a chained insert+update, with the check run at COMMIT.
-- Partial unique indexes cannot be deferred in Postgres; an EXCLUDE
-- constraint with all "=" operators is the equivalent form that can.

DROP INDEX IF EXISTS "Wage_teamId_userAddress_active_key";

ALTER TABLE "Wage" ADD CONSTRAINT "Wage_active_unique"
  EXCLUDE ("teamId" WITH =, "userAddress" WITH =)
  WHERE ("nextWageId" IS NULL)
  DEFERRABLE INITIALLY DEFERRED;
