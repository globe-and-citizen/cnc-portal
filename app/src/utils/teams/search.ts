interface DirectoryItem {
  name?: string
  address: string
  type?: string
}

interface DirectorySearch {
  name: string
  address: string
}

/** Filter team members and contracts by their visible identity fields. */
export function filterDirectoryItems<T extends DirectoryItem>(
  items: readonly T[],
  search: DirectorySearch
): T[] {
  const nameQuery = search.name.toLowerCase().trim()
  const addressQuery = search.address.toLowerCase().trim()

  return items.filter((item) => {
    const nameMatch = item.name?.toLowerCase().includes(nameQuery)
    const typeMatch = item.type?.toLowerCase().includes(nameQuery)
    const addressMatch = item.address.toLowerCase().includes(addressQuery)
    return Boolean((nameMatch && addressMatch) || (typeMatch && addressMatch))
  })
}
