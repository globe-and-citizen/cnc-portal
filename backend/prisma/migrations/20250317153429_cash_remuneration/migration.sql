/*
  Warnings:

  - You are about to drop the column `cashRemunerationSignature` on the `Claim` table. All the data in the column will be lost.
  - You are about to drop the column `memberTeamsDataId` on the `Claim` table. All the data in the column will be lost.
  - You are about to drop the column `hourlyRate` on the `MemberTeamsData` table. All the data in the column will be lost.
  - You are about to drop the column `maxHoursPerWeek` on the `MemberTeamsData` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `BoardOfDirectorActions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Claim` table without a default value. This is not possible if the table is not empty.
  - Added the required column `wageId` to the `Claim` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `MemberTeamsData` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Notification` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Team` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `TeamContract` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Claim" DROP CONSTRAINT "Claim_memberTeamsDataId_fkey";

-- AlterTable
ALTER TABLE "BoardOfDirectorActions" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Claim" DROP COLUMN "cashRemunerationSignature",
DROP COLUMN "memberTeamsDataId",
ADD COLUMN     "signature" TEXT,
ADD COLUMN     "tokenTx" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "wageId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "MemberTeamsData" DROP COLUMN "hourlyRate",
DROP COLUMN "maxHoursPerWeek",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "TeamContract" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "Wage" (
    "id" SERIAL NOT NULL,
    "teamId" INTEGER NOT NULL,
    "userAddress" TEXT NOT NULL,
    "cashRatePerHour" INTEGER NOT NULL,
    "tokenRatePerHour" INTEGER NOT NULL,
    "maximumHoursPerWeek" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Wage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wageRelated" (
    "nextWageId" INTEGER NOT NULL,
    "previousWageId" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "wageRelated_previousWageId_key" ON "wageRelated"("previousWageId");

-- AddForeignKey
ALTER TABLE "Wage" ADD CONSTRAINT "Wage_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wage" ADD CONSTRAINT "Wage_userAddress_fkey" FOREIGN KEY ("userAddress") REFERENCES "User"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wageRelated" ADD CONSTRAINT "wageRelated_nextWageId_fkey" FOREIGN KEY ("nextWageId") REFERENCES "Wage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wageRelated" ADD CONSTRAINT "wageRelated_previousWageId_fkey" FOREIGN KEY ("previousWageId") REFERENCES "Wage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Claim" ADD CONSTRAINT "Claim_wageId_fkey" FOREIGN KEY ("wageId") REFERENCES "Wage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
