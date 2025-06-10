/*
  Warnings:

  - You are about to drop the column `cashRatePerHour` on the `Wage` table. All the data in the column will be lost.
  - You are about to drop the column `tokenRatePerHour` on the `Wage` table. All the data in the column will be lost.
  - You are about to drop the column `usdcRatePerHour` on the `Wage` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Wage" DROP COLUMN "cashRatePerHour",
DROP COLUMN "tokenRatePerHour",
DROP COLUMN "usdcRatePerHour",
ADD COLUMN     "ratePerHour" JSONB NOT NULL DEFAULT '[{"type": "cash", "amount": 0},{"type": "usdc", "amount": 0},{"type": "token", "amount": 0}]';
