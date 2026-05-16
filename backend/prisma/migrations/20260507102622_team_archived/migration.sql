-- AlterTable
ALTER TABLE "MemberTeamsData" ADD COLUMN     "isVisible" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "isArchived" BOOLEAN NOT NULL DEFAULT false;
