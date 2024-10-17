/*
  Warnings:

  - Added the required column `memberTeamsDataId` to the `UserRole` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "UserRole" ADD COLUMN     "memberTeamsDataId" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_memberTeamsDataId_fkey" FOREIGN KEY ("memberTeamsDataId") REFERENCES "MemberTeamsData"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
