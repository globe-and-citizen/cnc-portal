-- Smooth-migration support for the v0.10 CashRemunerationEIP712 redeploy
-- (issue #1825). Two concerns are folded into one migration because they
-- ship as a single feature:
--
-- 1) `TeamOfficer.version` tags an Officer generation. New deploys (created
--    via createOfficer / syncContracts after this migration lands) are
--    stamped 'v0.10'. Pre-existing rows are backfilled to 'legacy' so the
--    UI can derive `isMigrated = currentOfficer.version === 'v0.10'` and
--    freeze new sign/submit flows on un-migrated teams.
--
-- 2) `WeeklyClaim.signedAgainstContractAddress` captures the EIP-712
--    verifyingContract that a signature was bound to. With this column, a
--    `signed` row whose stored address no longer matches the team's current
--    CashRemunerationEIP712 is trivially derivable as stale, surfaced as
--    "needs re-signing" in the UI, and re-signed against the new contract
--    without a transactional sweep at redeploy time.

ALTER TABLE "TeamOfficer" ADD COLUMN "version" TEXT;

UPDATE "TeamOfficer" SET "version" = 'legacy' WHERE "version" IS NULL;

ALTER TABLE "WeeklyClaim" ADD COLUMN "signedAgainstContractAddress" TEXT;
