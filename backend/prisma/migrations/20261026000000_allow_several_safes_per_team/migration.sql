-- AlterTable
ALTER TABLE "TeamContract" ADD COLUMN     "activatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "removedAt" TIMESTAMP(3);

-- A team keeps every Safe it registered and its default Safe is the latest activated one
-- not removed, so an existing row starts active from its registration date.
UPDATE "TeamContract" SET "activatedAt" = "createdAt";

-- The one-Safe-per-team index would refuse each new Safe. An address still belongs to one
-- team only through TeamContract.address.
DROP INDEX IF EXISTS "TeamContract_one_safe_per_team";
