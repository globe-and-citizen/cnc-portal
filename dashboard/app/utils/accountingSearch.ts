/**
 * Case-insensitive substring match for accounting table search boxes.
 * Empty or whitespace-only query matches every row.
 */
export function normalizeAccountingSearchQuery(query: string): string {
  return query.trim().toLowerCase()
}

export function matchesAccountingSearch(
  query: string,
  ...fields: (string | number | undefined | null)[]
): boolean {
  const normalized = normalizeAccountingSearchQuery(query)
  if (!normalized) {
    return true
  }
  return fields.some((field) => {
    if (field == null) {
      return false
    }
    return String(field).toLowerCase().includes(normalized)
  })
}
