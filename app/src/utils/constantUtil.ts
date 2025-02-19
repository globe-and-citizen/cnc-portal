import { NETWORK, USDC_ADDRESS, USDT_ADDRESS } from '@/constant'
import { zeroAddress } from 'viem'

export const tokenSymbol = (tokenAddress: string) => {
  const symbols = {
    [USDC_ADDRESS]: 'USDC',
    [USDT_ADDRESS]: 'USDT',
    [zeroAddress]: NETWORK.currencySymbol
  }

  return symbols[tokenAddress] || ''
}
