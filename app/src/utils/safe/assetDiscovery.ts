/** Discover read-only assets by chain and contract, independently of payment symbols. */
import { isAddress } from 'viem'
import { SUPPORTED_TOKENS } from '@/constant'
import type { SafeIncomingTransfer } from '@/types/safe'
import { assetId, assetMetadata, type AssetMetadata } from '@/utils/tokens/assets'

export function discoverSafeAssets(
  transfers: readonly SafeIncomingTransfer[],
  chainId: number
): AssetMetadata[] {
  const supportedAssetIds = new Set(
    SUPPORTED_TOKENS.map((token) => assetId(token.address, chainId))
  )
  const tokens = new Map<string, AssetMetadata>()
  for (const transfer of transfers) {
    if (
      transfer.type !== 'ERC20_TRANSFER' ||
      !transfer.tokenAddress ||
      !isAddress(transfer.tokenAddress) ||
      supportedAssetIds.has(assetId(transfer.tokenAddress, chainId))
    )
      continue
    const asset = assetMetadata(transfer.tokenAddress, chainId, transfer.tokenInfo)
    const existing = tokens.get(asset.id)
    if (!existing || existing.decimals === null)
      tokens.set(asset.id, {
        ...asset,
        ...(existing?.logoUri && !asset.logoUri ? { logoUri: existing.logoUri } : {})
      })
    else if (!existing.logoUri && asset.logoUri)
      tokens.set(asset.id, { ...existing, logoUri: asset.logoUri })
  }
  return [...tokens.values()].sort((a, b) => a.id.localeCompare(b.id))
}
