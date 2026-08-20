-- A team can attach one Safe account. The partial index leaves other contract
-- types unconstrained while making concurrent Safe registration deterministic.
CREATE UNIQUE INDEX "TeamContract_one_safe_per_team"
ON "TeamContract" ("teamId")
WHERE "type" = 'Safe';
