-- Replace per-member visibility (isVisible) with isHidden (inverted meaning).
ALTER TABLE "MemberTeamsData" ADD COLUMN "isHidden" BOOLEAN NOT NULL DEFAULT false;

UPDATE "MemberTeamsData" SET "isHidden" = NOT "isVisible";

ALTER TABLE "MemberTeamsData" DROP COLUMN "isVisible";
