import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { useClient } from '@wagmi/vue'
import { multicall } from 'viem/actions'
import { parseAbi, type Address } from 'viem'
import { useTeamOfficersQuery } from '~/queries/contract.query'
import { USDC_ADDRESS, USDC_E_ADDRESS, USDT_ADDRESS } from '~/constant'

// Canonical Multicall3 (same address on every chain, incl. Polygon). Its
// getEthBalance lets us batch native balances alongside ERC-20 reads.
const MULTICALL3 = '0xcA11bde05977b3631167028862bE2a173976CA11' as const
const MULTICALL3_ABI = parseAbi(['function getEthBalance(address) view returns (uint256)'])
const ERC20_ABI = parseAbi(['function balanceOf(address) view returns (uint256)'])

// Only these types custody funds — matches ContractTable's VALUE_HOLDING_TYPES.
const VALUE_HOLDING_TYPES = new Set([
  'Bank',
  'ExpenseAccountEIP712',
  'CashRemunerationEIP712',
  'Safe'
])

const TOKENS: { symbol: string, address: Address, decimals: number }[] = [
  { symbol: 'USDC', address: USDC_ADDRESS, decimals: 6 },
  { symbol: 'USDC.e', address: USDC_E_ADDRESS, decimals: 6 },
  { symbol: 'USDT', address: USDT_ADDRESS, decimals: 6 }
]

export interface TeamBalanceRecap {
  native: bigint
  // Summed raw balance per token symbol, across all value-holding contracts.
  tokens: { symbol: string, decimals: number, raw: bigint }[]
}

/**
 * Aggregate, per team, the native + stablecoin balances held across every
 * value-holding contract of every Officer generation (current and legacy — so
 * funds stranded on a legacy contract still show up). One multicall per team.
 *
 * Reuses the ['team-officers', …] cache the Officer-history column already
 * populates, so no extra officer fetch.
 */
export const useTeamBalanceRecap = (teamId: MaybeRefOrGetter<number>) => {
  const chainId = Number(useRuntimeConfig().public.chainId)
  const client = useClient({ chainId })

  const { data: officers } = useTeamOfficersQuery(() => toValue(teamId))

  const addresses = computed<Address[]>(() => {
    const set = new Set<string>()
    for (const officer of officers.value ?? []) {
      for (const contract of officer.contracts ?? []) {
        if (VALUE_HOLDING_TYPES.has(contract.type)) set.add(contract.address)
      }
    }
    return [...set] as Address[]
  })

  return useQuery({
    queryKey: ['team-balance-recap', { teamId: toValue(teamId), addresses: addresses.value }],
    queryFn: async (): Promise<TeamBalanceRecap> => {
      const list = addresses.value
      if (!client.value || list.length === 0) {
        return { native: 0n, tokens: TOKENS.map(t => ({ symbol: t.symbol, decimals: t.decimals, raw: 0n })) }
      }

      const nativeCalls = list.map(address => ({
        address: MULTICALL3 as Address,
        abi: MULTICALL3_ABI,
        functionName: 'getEthBalance',
        args: [address]
      }))
      const tokenCalls = list.flatMap(address =>
        TOKENS.map(token => ({
          address: token.address,
          abi: ERC20_ABI,
          functionName: 'balanceOf',
          args: [address]
        }))
      )

      const results = await multicall(client.value, {
        allowFailure: true,
        contracts: [...nativeCalls, ...tokenCalls]
      })

      const sum = (r: (typeof results)[number] | undefined) =>
        r && r.status === 'success' ? (r.result as bigint) : 0n

      let native = 0n
      for (let i = 0; i < list.length; i++) native += sum(results[i])

      const tokens = TOKENS.map((token, t) => {
        let raw = 0n
        for (let a = 0; a < list.length; a++) {
          raw += sum(results[list.length + a * TOKENS.length + t])
        }
        return { symbol: token.symbol, decimals: token.decimals, raw }
      })

      return { native, tokens }
    },
    enabled: () => addresses.value.length > 0 && !!client.value,
    refetchOnWindowFocus: false,
    staleTime: 1000 * 30
  })
}
