/*
  Warnings:

  - You are about to drop the column `signature` on the `Claim` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Claim` table. All the data in the column will be lost.
  - You are about to drop the column `tokenTx` on the `Claim` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Claim" DROP COLUMN "signature",
DROP COLUMN "status",
DROP COLUMN "tokenTx";
