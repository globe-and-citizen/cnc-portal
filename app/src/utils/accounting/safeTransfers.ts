/**
 * Adapt the Safe Transaction Service transfers into the mapper's
 * {@link SafeTransferRow} shape — the incoming-transfer and executed-multisig
 * adapters split out of {@link ./assemble} so that file stays focused on the
 * pipeline itself.
 */
import type { CowOrder } from '@/types/cow'
import type { SafeIncomingTransfer, SafeTransaction } from '@/types/safe'
import type { SafeDepositRow } from '@/types/contract-events/investor'
import { transactionHashOf } from '@/utils/accounting/journalEntryDraft'
import type { SafeSwapFeeRow, SafeTransferRow } from '@/utils/accounting/mappers/safe'
import { currentChainId } from '@/constant'
import { assetMetadata } from '@/utils/tokens/assets'

/** A SHER value transfer carries no cash; skip NFT moves entirely. */
function isMonetaryTransfer(t: SafeIncomingTransfer): boolean {
  return t.type === 'ETHER_TRANSFER' || t.type === 'ERC20_TRANSFER'
}

/**
 * Transaction identities whose Safe cash leg is already booked by a
 * SafeDepositRouter `Deposited` event.
 */
function routerDepositTransactions(
  deposits: readonly SafeDepositRow[] | null | undefined
): Set<string> {
  const hashes = new Set<string>()
  for (const deposit of deposits ?? []) {
    const txHash = deposit.txHash ?? transactionHashOf(deposit.id)
    if (txHash) hashes.add(txHash.toLowerCase())
  }
  return hashes
}

/**
 * Adapt the Safe Transaction Service incoming transfers into the mapper's
 * {@link SafeTransferRow} shape. ERC-721 moves are dropped (no cash); the ISO
 * `executionDate` becomes Unix seconds.
 *
 * Investments routed through the SafeDepositRouter also land in the Safe and are
 * booked from the router event (UC-SDR-01 → Investor Equity), so the matching
 * Safe inflow is excluded to avoid double-counting it **and** misreading it as a
 * client payment (Service Revenue). Both feeds carry the on-chain transaction
 * hash, which is the only safe correlation: a depositor can make distinct direct
 * and routed deposits for the same amount.
 */
export function toSafeTransferRows(
  transfers: readonly SafeIncomingTransfer[] | null | undefined,
  routerDeposits?: readonly SafeDepositRow[] | null,
  chainId = currentChainId
): SafeTransferRow[] {
  const routedTransactions = routerDepositTransactions(routerDeposits)
  const rows: SafeTransferRow[] = []
  transfers?.forEach((t, index) => {
    if (!isMonetaryTransfer(t)) return
    if (routedTransactions.has(t.transactionHash.toLowerCase())) return
    rows.push({
      id: t.transferId ?? `${t.transactionHash}-${index}`,
      from: t.from,
      to: t.to,
      token: t.type === 'ERC20_TRANSFER' ? (t.tokenAddress ?? 'unknown') : null,
      ...(t.type === 'ERC20_TRANSFER'
        ? { asset: assetMetadata(t.tokenAddress ?? 'unknown', chainId, t.tokenInfo) }
        : {}),
      amount: t.value,
      timestamp: Math.floor(new Date(t.executionDate).getTime() / 1000),
      txHash: t.transactionHash
    })
  })
  return rows
}

/**
 * Convert executed Safe multisig transactions into {@link SafeTransferRow}s so the
 * mapper can book outflows (Cr Cash — Safe). Handles native transfers (`value > 0`)
 * and ERC-20 `transfer(to, amount)` calls (decoded by the Transaction Service).
 */
export function toSafeOutgoingTransferRows(
  transactions: readonly SafeTransaction[] | null | undefined,
  safeAddress: string
): SafeTransferRow[] {
  const rows: SafeTransferRow[] = []
  for (const tx of transactions ?? []) {
    if (!tx.isExecuted || tx.isSuccessful === false || !tx.executionDate) continue
    const timestamp = Math.floor(new Date(tx.executionDate).getTime() / 1000)
    const txHash = tx.transactionHash ?? tx.safeTxHash

    if (tx.dataDecoded?.method === 'transfer' && tx.dataDecoded.parameters?.length >= 2) {
      const recipient = tx.dataDecoded.parameters[0]?.value
      const amount = tx.dataDecoded.parameters[1]?.value
      if (recipient && amount && amount !== '0') {
        rows.push({
          id: `out-${txHash}-erc20`,
          from: safeAddress,
          to: recipient,
          token: tx.to,
          amount,
          timestamp,
          txHash
        })
      }
    }

    if (tx.value && tx.value !== '0') {
      rows.push({
        id: `out-${txHash}-native`,
        from: safeAddress,
        to: tx.to,
        token: null,
        amount: tx.value,
        timestamp,
        txHash
      })
    }
  }
  return rows
}

/** Transactions in which the Safe both sent and received a token — the ones that may be swaps. */
export function safeSwapTransactionHashes(
  transfers: readonly SafeIncomingTransfer[] | null | undefined,
  safeAddress: string | null | undefined
): string[] {
  const safe = safeAddress?.toLowerCase()
  if (!safe) return []
  const sent = new Set<string>()
  const received = new Set<string>()
  for (const t of transfers ?? []) {
    if (!isMonetaryTransfer(t)) continue
    if (t.from.toLowerCase() === safe) sent.add(t.transactionHash)
    if (t.to.toLowerCase() === safe) received.add(t.transactionHash)
  }
  return [...sent].filter((txHash) => received.has(txHash))
}

/**
 * Fees CoW Protocol reports for the Safe's own fulfilled orders, the same evidence the Safe's
 * swap overview shows as transaction fees. A missing or malformed answer yields no fee.
 */
export function toSafeSwapFeeRows(
  orders: readonly { txHash: string; data?: readonly CowOrder[] }[] | null | undefined,
  safeAddress: string
): SafeSwapFeeRow[] {
  const safe = safeAddress.toLowerCase()
  return (orders ?? []).flatMap(({ txHash, data }) =>
    (data ?? []).flatMap((order) =>
      order.owner.toLowerCase() === safe &&
      order.status === 'fulfilled' &&
      order.executedFeeToken &&
      order.executedFee &&
      /^\d+$/.test(order.executedFee)
        ? [{ txHash, token: order.executedFeeToken, amount: order.executedFee }]
        : []
    )
  )
}
