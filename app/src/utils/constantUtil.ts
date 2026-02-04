import { NETWORK, USDC_ADDRESS, USDT_ADDRESS, USDC_E_ADDRESS } from '@/constant'
import { zeroAddress, formatEther } from 'viem'
import type { TokenId } from '@/constant'
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
