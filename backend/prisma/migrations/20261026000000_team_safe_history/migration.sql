-- A team keeps every Safe it registered: the default Safe is the one not removed with
-- the latest activation, so an existing row starts active from its registration date.
ALTER TABLE "TeamContract" ADD COLUMN "activatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "TeamContract" ADD COLUMN "removedAt" TIMESTAMP(3);

UPDATE "TeamContract" SET "activatedAt" = "createdAt";
