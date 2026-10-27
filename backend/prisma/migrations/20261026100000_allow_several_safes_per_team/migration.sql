-- A team now keeps every Safe it registered, so the one-Safe-per-team index would refuse
-- each new Safe. An address still belongs to one team only through TeamContract.address.
DROP INDEX IF EXISTS "TeamContract_one_safe_per_team";
