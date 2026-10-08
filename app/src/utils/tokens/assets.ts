/** Read-only asset identities. Payment allowlists remain TokenId-based. */
import { isAddress, zeroAddress } from 'viem'
import type { TokenId } from '@/constant'
import { getTokenDecimals, isSupportedTokenId, resolveTokenIdByAddress } from './metadata'

export type AssetId = TokenId | `erc20:${number}:${string}`

export interface AssetMetadata {
  id: AssetId
  chainId: number
  address: string
  symbol: string
  name: string
  /** Null when matching metadata is missing/invalid, RPC recovery fails, or precision exceeds 18. */
  decimals: number | null
  trusted?: boolean
  logoUri?: string
}

/** Display-only token images; executable and credential-bearing URLs are not logos. */
export function assetLogoUri(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined
  try {
    const url = new URL(value.trim())
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : undefined
  } catch {
    return undefined
  }
}

/** Discovery uses chain + lowercase contract; supported payment TokenIds are resolved separately. */
export function assetId(address: string, chainId: number): AssetId {
  return `erc20:${chainId}:${address.toLowerCase()}`
}

export function assetMetadata(
  address: string,
  chainId: number,
  info?: {
    address: string
    symbol: string
    name: string
    decimals: number
    trusted?: boolean
    logoUri?: string
  } | null
): AssetMetadata {
  const matches = info?.address?.toLowerCase() === address.toLowerCase()
  const decimals =
    matches && Number.isInteger(info.decimals) && info.decimals >= 0 && info.decimals <= 18
      ? info.decimals
      : null
  const logoUri = matches ? assetLogoUri(info.logoUri) : undefined
  return {
    id: assetId(address, chainId),
    chainId,
    address: address.toLowerCase(),
    symbol: matches && info.symbol?.trim() ? info.symbol.trim().slice(0, 40) : address,
    name: matches && info.name?.trim() ? info.name.trim().slice(0, 100) : 'Unknown token',
    decimals,
    ...(matches && info.trusted !== undefined ? { trusted: info.trusted } : {}),
    ...(logoUri ? { logoUri } : {})
  }
}

export function assetDecimals(token: AssetId, metadata?: AssetMetadata): number | null {
  return isSupportedTokenId(token) ? getTokenDecimals(token) : (metadata?.decimals ?? null)
}

/** Native is evidenced by the transfer type, never by a failed token lookup. */
export function knownAssetId(address: string | null): TokenId | null {
  if (address === null) return 'native'
  if (!isAddress(address) || address.toLowerCase() === zeroAddress) return null
  return resolveTokenIdByAddress(address)
}
