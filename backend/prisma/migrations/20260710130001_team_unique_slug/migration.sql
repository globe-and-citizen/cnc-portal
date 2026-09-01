-- Teams may now share a name; uniqueness moves to a generated `slug`.

-- DropIndex
DROP INDEX "Team_name_key";

-- AlterTable: add slug (nullable during backfill)
ALTER TABLE "Team" ADD COLUMN "slug" TEXT;

-- Backfill slugs from existing names, de-duplicating homonyms with a numeric
-- suffix (acme-corp, acme-corp-2, …). Names that slugify to nothing fall back
-- to `team`.
WITH base AS (
  SELECT
    "id",
    COALESCE(
      NULLIF(trim(BOTH '-' FROM regexp_replace(lower("name"), '[^a-z0-9]+', '-', 'g')), ''),
      'team'
    ) AS root
  FROM "Team"
),
numbered AS (
  SELECT
    "id",
    root,
    row_number() OVER (PARTITION BY root ORDER BY "id") AS rn
  FROM base
)
UPDATE "Team" t
SET "slug" = CASE WHEN n.rn = 1 THEN n.root ELSE n.root || '-' || n.rn::text END
FROM numbered n
WHERE t."id" = n."id";

-- Safety net: names were globally unique, but two distinct names can still
-- slugify into the same value across partitions (e.g. "Acme" -> acme-2 and
-- "Acme 2" -> acme-2). Break any residual collision with the row's unique id
-- so the unique index below never aborts the migration.
UPDATE "Team" t
SET "slug" = t."slug" || '-' || t."id"::text
WHERE EXISTS (
  SELECT 1 FROM "Team" o WHERE o."slug" = t."slug" AND o."id" <> t."id"
);

-- Enforce NOT NULL + uniqueness
ALTER TABLE "Team" ALTER COLUMN "slug" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Team_slug_key" ON "Team"("slug");
