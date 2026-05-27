-- AlterTable
ALTER TABLE "MemberTeamsData" ADD COLUMN     "isHidden" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "isArchived" BOOLEAN NOT NULL DEFAULT false;
