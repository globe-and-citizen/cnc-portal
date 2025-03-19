import { NETWORK, USDC_ADDRESS, USDT_ADDRESS } from '@/constant'
import { zeroAddress, formatEther } from 'viem'

export const tokenSymbol = (tokenAddress: string) => {
  const symbols = {
    [USDC_ADDRESS.toLocaleLowerCase()]: 'USDC',
    [USDT_ADDRESS.toLocaleLowerCase()]: 'USDT',
    [zeroAddress]: NETWORK.currencySymbol
  }

  return symbols[tokenAddress.toLocaleLowerCase()] || ''
}

export const formatEtherUtil = (amount: bigint, tokenAddress: string) =>
  tokenAddress === zeroAddress ? formatEther(amount) : `${Number(amount) / 1e6}`
