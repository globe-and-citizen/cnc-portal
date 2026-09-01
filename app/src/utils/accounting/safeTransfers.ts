/**
 * Adapt the Safe Transaction Service transfers into the mapper's
 * {@link SafeTransferRow} shape — the incoming-transfer and executed-multisig
 * adapters split out of {@link ./assemble} so that file stays focused on the
 * pipeline itself.
 */
import { getAddress, isAddress, type Address } from 'viem'
import type { SafeIncomingTransfer, SafeTransaction } from '@/types/safe'
import type { SafeDepositRow } from '@/types/ponder/investor'
import type { SafeTransferRow } from '@/utils/accounting/mappers/safe'

/** A SHER value transfer carries no cash; skip NFT moves entirely. */
function isMonetaryTransfer(t: SafeIncomingTransfer): boolean {
  return t.type === 'ETHER_TRANSFER' || t.type === 'ERC20_TRANSFER'
}

function sameAddress(a: string | null | undefined, b: string | null | undefined): boolean {
  return !!a && !!b && isAddress(a) && isAddress(b) && getAddress(a) === getAddress(b)
}

/** `${depositor}|${amount}` — keys a Safe inflow to the router deposit that backs it. */
function routedKey(depositor: string, amount: string): string {
  return `${depositor.toLowerCase()}|${amount}`
}

/**
 * A consumable multiset of the (depositor, deposited-amount) pairs that arrived
 * through the SafeDepositRouter, so the matching Safe inflows can be excluded.
 */
function buildRoutedDeposits(
  deposits: readonly SafeDepositRow[] | null | undefined
): Map<string, number> {
  const counts = new Map<string, number>()
  for (const d of deposits ?? []) {
    const key = routedKey(d.depositor, d.tokenAmount)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return counts
}

/**
 * Adapt the Safe Transaction Service incoming transfers into the mapper's
 * {@link SafeTransferRow} shape. ERC-721 moves are dropped (no cash); the ISO
 * `executionDate` becomes Unix seconds.
 *
 * Investments routed through the SafeDepositRouter also land in the Safe and are
 * booked from the router event (UC-SDR-01 → Investor Equity), so the matching
 * Safe inflow is excluded to avoid double-counting it **and** misreading it as a
 * client payment (Service Revenue). The router forwards funds with `from = the
 * depositor` (not the router address), so excluding only `from === router` is not
 * enough: we also drop inflows that match a router deposit by (depositor, amount).
 */
export function toSafeTransferRows(
  transfers: readonly SafeIncomingTransfer[] | null | undefined,
  routerAddress?: Address | string | null,
  routerDeposits?: readonly SafeDepositRow[] | null
): SafeTransferRow[] {
  const routed = buildRoutedDeposits(routerDeposits)
  const rows: SafeTransferRow[] = []
  transfers?.forEach((t, index) => {
    if (!isMonetaryTransfer(t)) return
    if (routerAddress && sameAddress(t.from, routerAddress)) return
    const remaining = routed.get(routedKey(t.from, t.value)) ?? 0
    if (remaining > 0) {
      routed.set(routedKey(t.from, t.value), remaining - 1) // routed investment — booked by UC-SDR-01
      return
    }
    rows.push({
      id: `${t.transactionHash}-${index}`,
      from: t.from,
      to: t.to,
      token: t.type === 'ERC20_TRANSFER' ? (t.tokenAddress ?? null) : null,
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
