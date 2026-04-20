-- Add the linked list column on TeamOfficer. previousOfficerId is the
-- predecessor pointer; the row with no successor is the current officer for
-- its team. previousOfficerId is unique because each officer can have at most
-- one direct successor (chain, not tree).
ALTER TABLE "TeamOfficer" ADD COLUMN "previousOfficerId" INTEGER;

CREATE UNIQUE INDEX "TeamOfficer_previousOfficerId_key" ON "TeamOfficer"("previousOfficerId");

-- Enforce at-most-one head per team. Postgres treats NULLs as distinct in a
-- normal unique index, so two concurrent createOfficer calls for a team with
-- no prior Officer could both succeed with previousOfficerId = NULL, creating
-- two linked-list heads. A partial unique index on teamId scoped to rows with
-- NULL previousOfficerId collapses that race into a P2002 conflict that the
-- application can handle (returned as 409 Conflict).
CREATE UNIQUE INDEX "TeamOfficer_one_head_per_team"
  ON "TeamOfficer"("teamId")
  WHERE "previousOfficerId" IS NULL;

ALTER TABLE "TeamOfficer" ADD CONSTRAINT "TeamOfficer_previousOfficerId_fkey"
  FOREIGN KEY ("previousOfficerId") REFERENCES "TeamOfficer"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- No backfill needed: every existing TeamOfficer is the first (and only)
-- entry in its team's chain, so previousOfficerId stays NULL across the board.
-- This was true at the time of the previous migration (one TeamOfficer per
-- team backfilled from Team.officerAddress) and remains true since no team
-- has had an Officer redeploy yet.

-- Drop the denormalized officerAddress column. The current officer is now
-- derived from the linked list head (TeamOfficer where nextOfficer is null).
ALTER TABLE "Team" DROP COLUMN "officerAddress";
