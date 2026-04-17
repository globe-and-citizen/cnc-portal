-- AlterTable
ALTER TABLE "TeamContract" ADD COLUMN     "officerId" INTEGER;

-- CreateTable
CREATE TABLE "TeamOfficer" (
    "id" SERIAL NOT NULL,
    "address" TEXT NOT NULL,
    "teamId" INTEGER NOT NULL,
    "deployer" TEXT NOT NULL,
    "deployBlockNumber" BIGINT,
    "deployedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamOfficer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TeamOfficer_address_key" ON "TeamOfficer"("address");

-- CreateIndex
CREATE INDEX "TeamOfficer_teamId_idx" ON "TeamOfficer"("teamId");

-- CreateIndex
CREATE INDEX "TeamContract_officerId_idx" ON "TeamContract"("officerId");

-- AddForeignKey
ALTER TABLE "TeamContract" ADD CONSTRAINT "TeamContract_officerId_fkey" FOREIGN KEY ("officerId") REFERENCES "TeamOfficer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamOfficer" ADD CONSTRAINT "TeamOfficer_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================
-- Backfill historical data for existing teams.
-- deployBlockNumber and deployedAt stay NULL: never captured before.
-- ============================================================

-- Pre-flight: Team.officerAddress was never unique before this migration, but
-- TeamOfficer.address is globally unique. Any duplicate officerAddress across
-- teams would be silently collapsed by the INSERT below, orphaning the losing
-- team's contracts once the follow-up migration drops Team.officerAddress.
-- Fail loudly so duplicates can be resolved before the data becomes
-- unrecoverable.
DO $$
DECLARE
  dupes INTEGER;
BEGIN
  SELECT COUNT(*) INTO dupes FROM (
    SELECT 1 FROM "Team"
    WHERE "officerAddress" IS NOT NULL
    GROUP BY "officerAddress" HAVING COUNT(*) > 1
  ) d;
  IF dupes > 0 THEN
    RAISE EXCEPTION
      'Refusing to backfill TeamOfficer: % duplicate officerAddress value(s) in Team. De-duplicate before re-running this migration.',
      dupes;
  END IF;
END $$;

-- One TeamOfficer per team that already has an officerAddress.
INSERT INTO "TeamOfficer" ("address", "teamId", "deployer", "createdAt", "updatedAt")
SELECT t."officerAddress", t."id", t."ownerAddress", t."createdAt", NOW()
FROM "Team" t
WHERE t."officerAddress" IS NOT NULL
ON CONFLICT ("address") DO NOTHING;

-- Link existing TeamContract rows to their TeamOfficer, excluding Safe contracts.
UPDATE "TeamContract" tc
SET "officerId" = o."id"
FROM "TeamOfficer" o, "Team" t
WHERE tc."teamId" = t."id"
  AND o."teamId" = t."id"
  AND o."address" = t."officerAddress"
  AND tc."type" NOT IN ('Safe', 'SafeDepositRouter');
