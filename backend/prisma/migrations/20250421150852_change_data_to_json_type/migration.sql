/*
  Warnings:

  - You are about to drop the column `expiry` on the `Expense` table. All the data in the column will be lost.
  - Changed the type of `data` on the `Expense` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- Single-step conversion (only if all data is valid JSON)
ALTER TABLE "Expense" 
ALTER COLUMN "data" TYPE JSONB 
USING data::jsonb;
