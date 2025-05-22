/*
  Warnings:

  - You are about to drop the column `description` on the `Claim` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Claim" DROP COLUMN "description",
ADD COLUMN     "memo" TEXT;
