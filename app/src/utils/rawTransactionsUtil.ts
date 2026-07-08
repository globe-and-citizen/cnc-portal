type TimestampedTransaction = {
  timestamp: number
}

type IncomingTokenTransfer = {
  id: string
  contractAddress: string
  to: string
  token: string
  amount: string
  timestamp: number
}

type RawTokenDeposit = {
  txHash: string
  timestamp: number
  from: string
  to: string
  amount: string
  tokenAddress: string
  type: 'tokenDeposit'
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

export const mapIncomingTransfersToTokenDeposits = (
  rows: ReadonlyArray<IncomingTokenTransfer> | null | undefined
): RawTokenDeposit[] =>
  (rows ?? []).map((row) => ({
    txHash: extractTxHashFromId(row.id),
    timestamp: row.timestamp,
    from: row.contractAddress,
    to: row.to,
    amount: row.amount,
    tokenAddress: row.token,
    type: 'tokenDeposit'
  }))
