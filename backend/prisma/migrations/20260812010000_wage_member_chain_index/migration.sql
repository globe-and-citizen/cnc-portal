-- Resolving the wage that covers a given week reads a member's whole chain
-- (`WHERE "teamId" = $1 AND "userAddress" = $2`), which now runs on every claim
-- and every weekly-goals submission. Without this index that is a sequential
-- scan over every wage of every team.
CREATE INDEX IF NOT EXISTS "Wage_teamId_userAddress_idx" ON "Wage" ("teamId", "userAddress");
