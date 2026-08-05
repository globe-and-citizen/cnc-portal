import { useQuery } from '@tanstack/vue-query'
import { useClient } from '@wagmi/vue'
import { multicall } from 'viem/actions'
import { formatUnits, parseAbi, type Address } from 'viem'
import type { MaybeRefOrGetter } from 'vue'
import { toValue } from 'vue'
import { USDC_ADDRESS, USDC_E_ADDRESS, USDT_ADDRESS } from '~/constant'

const ERC20_ABI = parseAbi(['function balanceOf(address) view returns (uint256)'])

// Stablecoins we surface per contract (all 6-decimal on Polygon).
const TOKENS: { symbol: string, address: Address, decimals: number }[] = [
  { symbol: 'USDC', address: USDC_ADDRESS, decimals: 6 },
  { symbol: 'USDC.e', address: USDC_E_ADDRESS, decimals: 6 },
  { symbol: 'USDT', address: USDT_ADDRESS, decimals: 6 }
]

export interface TokenBalance {
  symbol: string
  address: Address
  raw: bigint
  formatted: string
}

/**
 * Read a contract's ERC-20 stablecoin balances (USDC / USDC.e / USDT) in one
 * multicall. Returns only non-zero balances.
 */
export const useContractTokenBalancesQuery = (
  address: MaybeRefOrGetter<string | null | undefined>
) => {
  const chainId = Number(useRuntimeConfig().public.chainId)
  const client = useClient({ chainId })

  return useQuery({
    queryKey: ['contract-token-balances', { address: toValue(address) }],
    queryFn: async (): Promise<TokenBalance[]> => {
      const target = toValue(address)
      if (!target || !client.value) return []

      const results = await multicall(client.value, {
        allowFailure: true,
        contracts: TOKENS.map(token => ({
          address: token.address,
          abi: ERC20_ABI,
          functionName: 'balanceOf',
          args: [target as Address]
        }))
      })

      return TOKENS.flatMap((token, i) => {
        const result = results[i]
        if (!result || result.status !== 'success') return []
        const raw = result.result as bigint
        if (raw === 0n) return []
        return [{
          symbol: token.symbol,
          address: token.address,
          raw,
          formatted: Number(formatUnits(raw, token.decimals)).toLocaleString(undefined, {
            maximumFractionDigits: 2
          })
        }]
      })
    },
    enabled: () => !!toValue(address),
    refetchOnWindowFocus: false,
    staleTime: 1000 * 30
  })
}
