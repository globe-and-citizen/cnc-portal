-- Drop trader-related fields
DROP INDEX IF EXISTS "User_traderSafeAddress_key";
ALTER TABLE "User" DROP COLUMN IF EXISTS "traderSafeAddress";
ALTER TABLE "MemberTeamsData" DROP COLUMN IF EXISTS "isTrader";
