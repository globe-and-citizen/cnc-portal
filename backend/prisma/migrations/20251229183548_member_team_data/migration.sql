/*
  Warnings:

  - You are about to drop the column `userAddress` on the `MemberTeamsData` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[memberAddress,teamId]` on the table `MemberTeamsData` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `memberAddress` to the `MemberTeamsData` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "MemberTeamsData" DROP CONSTRAINT "MemberTeamsData_userAddress_fkey";

-- DropIndex
DROP INDEX "MemberTeamsData_userAddress_teamId_key";

-- AlterTable
ALTER TABLE "MemberTeamsData" DROP COLUMN "userAddress",
ADD COLUMN     "memberAddress" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "MemberTeamsData_memberAddress_teamId_key" ON "MemberTeamsData"("memberAddress", "teamId");

-- AddForeignKey
ALTER TABLE "MemberTeamsData" ADD CONSTRAINT "MemberTeamsData_memberAddress_fkey" FOREIGN KEY ("memberAddress") REFERENCES "User"("address") ON DELETE CASCADE ON UPDATE CASCADE;
