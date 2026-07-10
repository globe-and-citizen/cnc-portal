/**
 * URL-friendly slug helpers.
 *
 * Kept dependency-free (no Prisma import) so the uniqueness strategy can be
 * unit-tested with a fake `exists` predicate and reused by any caller that
 * knows how to check its own store (controller, seeder, …).
 */

/**
 * Turn an arbitrary string into a slug: lowercase, non-alphanumeric runs
 * collapsed to a single hyphen, no leading/trailing hyphens. Falls back to
 * `'team'` when the input has no usable characters (e.g. only symbols).
 *
 * The output always satisfies the shared `slugSchema` regex
 * (`^[a-z0-9]+(?:-[a-z0-9]+)*$`) in `validation/utils.ts`.
 */
export const slugify = (input: string): string => {
  const slug = input
    .toLowerCase()
    // Collapse every run of non-alphanumerics to a single hyphen. After this
    // the string never contains consecutive hyphens…
    .replace(/[^a-z0-9]+/g, '-')
    // …so trimming a single leading/trailing hyphen is enough — no `+`
    // quantifier, which keeps the match linear (avoids the polynomial-regex
    // ReDoS class CodeQL flags on user-controlled input).
    .replace(/^-|-$/g, '');
  return slug || 'team';
};

/**
 * Build a unique slug from `base` by appending a numeric suffix on collision:
 * `acme-corp`, then `acme-corp-2`, `acme-corp-3`, … until `exists` reports the
 * candidate is free.
 *
 * @param base   raw string to slugify (e.g. a team name)
 * @param exists resolves `true` when the candidate slug is already taken
 */
export const generateUniqueSlug = async (
  base: string,
  exists: (slug: string) => Promise<boolean>
): Promise<string> => {
  const root = slugify(base);
  let candidate = root;
  let suffix = 1;
  while (await exists(candidate)) {
    suffix += 1;
    candidate = `${root}-${suffix}`;
  }
  return candidate;
};
