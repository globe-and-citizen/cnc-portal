import type { GroupedTransactionRow } from '@/types/transaction-history'
import { useTeamStore, useCurrencyStore } from '@/stores'
import { getTokenIcon } from '@/utils/constantUtil'

export const parseBigIntOrZero = (value: string): bigint => {
  try {
    return BigInt(value)
  } catch {
    return 0n
  }
}

export const resolveUser = (address: string) => {
  const teamStore = useTeamStore()
  const currencyStore = useCurrencyStore()
  const lower = address?.toLowerCase() ?? ''

  const contract = teamStore.currentTeam?.teamContracts?.find(
    (c) => c.address.toLowerCase() === lower
  )
  if (contract) return { name: contract.type, address, icon: 'heroicons:document-text' }

  const member = teamStore.currentTeam?.members.find((m) => m.address.toLowerCase() === lower)
  if (member) return member

  const token = currencyStore.supportedTokens.find((t) => t.address.toLowerCase() === lower)
  if (token) {
    return {
      name: token.symbol,
      address,
      imageUrl: getTokenIcon(token.id)
    }
  }

  return { name: 'User', address }
}

const toGroupedLeafRow = <T extends { txHash: string }>(row: T): GroupedTransactionRow<T> => ({
  ...row,
  groupedEventCount: 1,
  subRows: []
})

export const groupTransactionsByTxHash = <T extends { txHash: string }>(
  rows: ReadonlyArray<T>
): GroupedTransactionRow<T>[] => {
  const groupedByTxHash = new Map<string, T[]>()

  rows.forEach((row) => {
    const grouped = groupedByTxHash.get(row.txHash) ?? []
    grouped.push(row)
    groupedByTxHash.set(row.txHash, grouped)
  })

  const seen = new Set<string>()
  const groupedRows: GroupedTransactionRow<T>[] = []

  rows.forEach((row) => {
    if (seen.has(row.txHash)) return

    seen.add(row.txHash)
    const groupedEvents = groupedByTxHash.get(row.txHash) ?? [row]
    const [parentEvent, ...childEvents] = groupedEvents
    if (!parentEvent) return

    groupedRows.push({
      ...parentEvent,
      groupedEventCount: groupedEvents.length,
      subRows: childEvents.map(toGroupedLeafRow)
    })
  })

  return groupedRows
}
