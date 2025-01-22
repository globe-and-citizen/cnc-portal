/*
  Warnings:

  - The `status` column on the `Claim` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('PENDING', 'APPROVED', 'WITHDRAWED');

-- AlterTable
ALTER TABLE "Claim" ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "withdrawedAt" TIMESTAMP(3),
DROP COLUMN "status",
ADD COLUMN     "status" "ClaimStatus" NOT NULL DEFAULT 'PENDING';
