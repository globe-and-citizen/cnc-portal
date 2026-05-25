import { NETWORK, USDC_ADDRESS, USDT_ADDRESS, USDC_E_ADDRESS } from '@/constant'
import { zeroAddress, formatEther, parseUnits } from 'viem'
import type { TokenId } from '@/constant'
import USDCIcon from '@/assets/usdc.png'
import MaticIcon from '@/assets/matic-logo.png'
import EthereumIcon from '@/assets/Ethereum.png'

export const TOKEN_ICONS: Record<string, string> = {
  USDC: USDCIcon,
  USDCe: USDCIcon,
  POL: MaticIcon,
  ETH: EthereumIcon
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
  const symbols = {
    [USDC_ADDRESS.toLocaleLowerCase()]: 'USDC',
    [USDT_ADDRESS.toLocaleLowerCase()]: 'USDT',
    [USDC_E_ADDRESS.toLocaleLowerCase()]: 'USDC.e',
    [zeroAddress]: NETWORK.currencySymbol
  }

  return symbols[tokenAddress.toLocaleLowerCase()] || ''
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
