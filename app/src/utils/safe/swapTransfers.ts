import type { SafeIncomingTransfer } from '@/types/safe'

/** Native coin identity; ERC-20 assets use their lower-case contract address. */
export const SAFE_NATIVE_ASSET = 'native'

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
