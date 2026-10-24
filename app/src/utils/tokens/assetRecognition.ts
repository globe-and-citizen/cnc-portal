/**
 * Anyone can send any token to a public wallet, so receiving one proves nothing.
 * A contract becomes a company asset only when the company itself acquired it: the
 * Safe gave up another asset for it in a swap, which needs the owners' signatures.
 * Native and configured tokens are always accepted.
 */
import type { AssetId } from './assets'

export function isAcceptedAsset(token: AssetId, swapped: ReadonlySet<AssetId>): boolean {
  return !token.startsWith('erc20:') || swapped.has(token)
}

/** Every asset on either side of an evidenced Safe exchange. */
export function swappedAssets(
  entries: readonly { useCase: string; token: AssetId }[]
): Set<AssetId> {
  return new Set(
    entries.filter((entry) => entry.useCase === 'SAFE-SWAP').map((entry) => entry.token)
  )
}
