type TimestampedTransaction = {
  timestamp: number
}

export const extractTxHashFromId = (id: string): string => {
  const [txHash] = id.split('-')
  return txHash ?? id
}

export const buildRawTransactions = <T extends TimestampedTransaction>(
  sections: Array<ReadonlyArray<T> | null | undefined>
): T[] => {
  const merged = sections.flatMap((section) => section ?? [])
  return merged.sort((a, b) => b.timestamp - a.timestamp)
}
