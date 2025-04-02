-- AlterTable
ALTER TABLE "_MemberTeams" ADD CONSTRAINT "_MemberTeams_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_MemberTeams_AB_unique";
