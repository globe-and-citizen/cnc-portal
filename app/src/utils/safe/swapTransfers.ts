import { formatUnits } from 'viem'
import { NETWORK } from '@/constant'
import type { SafeIncomingTransfer } from '@/types/safe'

/** Native coin identity; ERC-20 assets use their lower-case contract address. */
export const SAFE_NATIVE_ASSET = 'native'

/** A quantity of one asset the Safe moved. */
export interface SafeAssetAmount {
  asset: string
  symbol: string
  quantity: number
}

/** The net quantity of one asset in a transaction: positive when the Safe received it. */
export interface SafeTransactionLeg extends SafeAssetAmount {
  isReceived: boolean
}

/**
 * The Safe's fungible movements in and out. NFT, self, zero and unknown-decimals movements are
 * left out.
 */
export function safeMovements(
  transfers: readonly SafeIncomingTransfer[] | null | undefined,
  safeAddress: string | null | undefined
): SafeIncomingTransfer[] {
  const address = safeAddress?.toLowerCase()
  if (!address) return []
  return (transfers ?? []).filter(
    ({ type, from, to, value, tokenAddress, tokenInfo }) =>
      type !== 'ERC721_TRANSFER' &&
      (from.toLowerCase() === address) !== (to.toLowerCase() === address) &&
      (type === 'ETHER_TRANSFER' || (!!tokenAddress && tokenInfo?.decimals !== undefined)) &&
      /^\d+$/.test(value) &&
      BigInt(value) > 0n
  )
}

/** Transactions in which the Safe sent one asset and received another. */
export function safeSwapHashes(
  movements: readonly SafeIncomingTransfer[],
  safeAddress: string
): Set<string> {
  const address = safeAddress.toLowerCase()
  const swapHashes = new Set<string>()
  for (const [hash, rows] of groupSafeTransfers(movements)) {
    const sent = new Set<string>()
    const received = new Set<string>()
    for (const row of rows) {
      const direction = row.from.toLowerCase() === address ? sent : received
      direction.add(safeTransferAsset(row))
    }
    if (
      sent.size &&
      received.size &&
      (sent.size > 1 ||
        received.size > 1 ||
        sent.values().next().value !== received.values().next().value)
    )
      swapHashes.add(hash)
  }
  return swapHashes
}

/** UTC day of a movement, `YYYY-MM-DD`: daily quotes are keyed by it. */
export function safeDayOf(executionDate: string): string {
  return new Date(executionDate).toISOString().slice(0, 10)
}

/** Asset identity of a fungible transfer with known metadata. */
export function safeTransferAsset(transfer: SafeIncomingTransfer): string {
  return transfer.type === 'ETHER_TRANSFER'
    ? SAFE_NATIVE_ASSET
    : transfer.tokenAddress!.toLowerCase()
}

/** Group movements once, preserving their original order and object identities. */
export function groupSafeTransfers(
  transfers: readonly SafeIncomingTransfer[]
): Map<string, SafeIncomingTransfer[]> {
  const groups = new Map<string, SafeIncomingTransfer[]>()
  for (const transfer of transfers) {
    const rows = groups.get(transfer.transactionHash)
    if (rows) rows.push(transfer)
    else groups.set(transfer.transactionHash, [transfer])
  }
  return groups
}

/** Net a transaction's movements exactly before converting quantities to display numbers. */
export function netSafeTransfers(transfers: readonly SafeIncomingTransfer[], safeAddress: string) {
  const safe = safeAddress.toLowerCase()
  const assets = new Map<string, { transfer: SafeIncomingTransfer; amount: bigint }>()
  for (const transfer of transfers) {
    const asset = safeTransferAsset(transfer)
    const amount = BigInt(transfer.value) * (transfer.to.toLowerCase() === safe ? 1n : -1n)
    const net = assets.get(asset)
    if (net) net.amount += amount
    else assets.set(asset, { transfer, amount })
  }
  return assets
}

/** The assets a transaction moved, netted, as display quantities; an asset that nets to zero is left out. */
export function safeTransactionLegs(
  transfers: readonly SafeIncomingTransfer[],
  safeAddress: string
): SafeTransactionLeg[] {
  return [...netSafeTransfers(transfers, safeAddress)]
    .filter(([, { amount }]) => amount !== 0n)
    .map(([asset, { transfer, amount }]) => {
      const native = transfer.type === 'ETHER_TRANSFER'
      return {
        asset,
        symbol: native ? NETWORK.currencySymbol : (transfer.tokenInfo?.symbol ?? 'Unknown'),
        quantity: Number(
          formatUnits(amount < 0n ? -amount : amount, native ? 18 : transfer.tokenInfo!.decimals)
        ),
        isReceived: amount > 0n
      }
    })
}
