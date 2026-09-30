import { NETWORK, SUPPORTED_TOKENS, USDC_ADDRESS, USDT_ADDRESS, USDC_E_ADDRESS } from '@/constant'
import { zeroAddress, formatEther, parseUnits } from 'viem'
import type { TokenId } from '@/constant'
import USDCIcon from '@/assets/usdc.png'
import MaticIcon from '@/assets/matic-logo.png'
import EthereumIcon from '@/assets/Ethereum.png'

const TOKEN_ICONS: Partial<Record<TokenId, string>> = {
  usdc: USDCIcon,
  'usdc.e': USDCIcon
}

export const getTokenIcon = (tokenId: TokenId): string | undefined => {
  if (tokenId === 'native') {
    const chainId = parseInt(NETWORK?.chainId ?? '0x0', 16)
    return chainId === 137 || chainId === 80002 ? MaticIcon : EthereumIcon
  }
  return TOKEN_ICONS[tokenId]
}

const tokenDecimals: Record<TokenId, number> = {
  native: 18,
  usdc: 6,
  'usdc.e': 6,
  usdt: 6,
  sher: 6
}

const tokenIdSet = new Set<TokenId>(Object.keys(tokenDecimals) as TokenId[])

export const tokenSymbol = (tokenAddress: string) => {
  // USDC/USDC.e/native come from SUPPORTED_TOKENS — the same symbol
  // `findCreditToken` (Community Credit's own lend flow) looks up against, so
  // a round's displayed token can never drift from what it can actually be
  // funded with. USDC.e used to have its own hand-typed 'USDC.e' here,
  // diverging from SUPPORTED_TOKENS' 'USDCe' and making every USDC.e round
  // unlendable — "Unsupported token: USDC.e" on every attempt.
  const normalized = tokenAddress.toLocaleLowerCase()
  const supported = SUPPORTED_TOKENS.find(
    (token) => token.address.toLocaleLowerCase() === normalized
  )
  if (supported) return supported.symbol

  // USDT isn't tracked in SUPPORTED_TOKENS (Community Credit and the Payment
  // Gate widget don't offer it), so it keeps its own direct mapping.
  if (normalized === USDT_ADDRESS.toLocaleLowerCase()) return 'USDT'

  return ''
}

export const formatEtherUtil = (amount: bigint, tokenAddress: string) =>
  tokenAddress === zeroAddress ? formatEther(amount) : `${Number(amount) / 1e6}`

export const tokenSymbolAddresses: Record<Exclude<TokenId, 'native'>, `0x${string}` | string> = {
  usdc: USDC_ADDRESS,
  usdt: USDT_ADDRESS,
  'usdc.e': USDC_E_ADDRESS,
  sher: zeroAddress
}

export const getTokenAddress = (tokenId: TokenId): string | undefined => {
  if (tokenId === 'native') return undefined
  return tokenSymbolAddresses[tokenId as Exclude<TokenId, 'native'>]
}

export const getTokenDecimals = (tokenId: TokenId): number => tokenDecimals[tokenId]

export const isSupportedTokenId = (value: string): value is TokenId =>
  tokenIdSet.has(value as TokenId)

export const isValidPositiveTokenAmount = (
  amount: string,
  tokenId: TokenId = 'native'
): boolean => {
  const normalizedAmount = amount.trim()
  if (!normalizedAmount) return false

  try {
    return parseUnits(normalizedAmount, getTokenDecimals(tokenId)) > 0n
  } catch {
    return false
  }
}

const KNOWN_TOKEN_IDS: TokenId[] = ['native', 'usdc', 'usdc.e', 'usdt', 'sher']

export const resolveTokenIdByAddress = (tokenAddress: string): TokenId | null => {
  const normalizedAddress = tokenAddress.toLowerCase()
  const knownId = KNOWN_TOKEN_IDS.find((tokenId) => {
    const knownAddress = (getTokenAddress(tokenId) ?? zeroAddress).toLowerCase()
    return knownAddress === normalizedAddress
  })

  return knownId ?? null
}
