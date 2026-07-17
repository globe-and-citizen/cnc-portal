import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useQueries } from '@tanstack/vue-query'
import { useClient } from '@wagmi/vue'
import { multicall } from 'viem/actions'
import { formatEther, formatUnits, parseAbi, type Address } from 'viem'
import { getTeamOfficers } from '~/api/contract'
import { USDC_ADDRESS, USDC_E_ADDRESS, USDT_ADDRESS } from '~/constant'
import type { Team } from '~/types'

const MULTICALL3 = '0xcA11bde05977b3631167028862bE2a173976CA11' as const
const MULTICALL3_ABI = parseAbi(['function getEthBalance(address) view returns (uint256)'])
const ERC20_ABI = parseAbi(['function balanceOf(address) view returns (uint256)'])

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

export interface TokenAmount {
  symbol: string
  decimals: number
  raw: bigint
}

export interface ContractBalance {
  address: Address
  type: string
  native: bigint
  tokens: TokenAmount[]
}

export interface TeamBalanceBreakdown {
  loading: boolean
  contracts: ContractBalance[]
  // Sort key: summed stablecoin value (all ~1 USD) across the team's contracts.
  totalStableValue: number
}

const EMPTY: TeamBalanceBreakdown = { loading: false, contracts: [], totalStableValue: 0 }

/**
 * List-level balance recap for every team: per value-holding contract, its
 * native + stablecoin balances, plus a numeric total (stablecoin sum) usable as
 * a sort key. One officers fetch + one balance multicall per team, both cached
 * and shared with the per-row cells.
 */
export const useTeamsBalanceRecaps = (teams: MaybeRefOrGetter<Team[]>) => {
  const chainId = Number(useRuntimeConfig().public.chainId)
  const client = useClient({ chainId })

  const teamList = computed(() => toValue(teams) ?? [])

  // 1. Officers (with their contracts) per team.
  const officerQueries = useQueries({
    queries: computed(() =>
      teamList.value.map(team => ({
        queryKey: ['team-officers', { teamId: team.id }],
        queryFn: async () => await getTeamOfficers(team.id),
        staleTime: 1000 * 60 * 5
      }))
    )
  })

  // Value-holding contracts (deduped by address) per team, across all officers.
  const contractsByTeam = computed(() => {
    const map = new Map<number, { address: Address, type: string }[]>()
    teamList.value.forEach((team, i) => {
      const byAddress = new Map<string, { address: Address, type: string }>()
      for (const officer of officerQueries.value[i]?.data ?? []) {
        for (const contract of officer.contracts ?? []) {
          if (VALUE_HOLDING_TYPES.has(contract.type)) {
            byAddress.set(contract.address.toLowerCase(), {
              address: contract.address as Address,
              type: contract.type
            })
          }
        }
      }
      map.set(team.id, [...byAddress.values()])
    })
    return map
  })

  // 2. One balance multicall per team (native via Multicall3 + ERC-20 balanceOf).
  const balanceQueries = useQueries({
    queries: computed(() =>
      teamList.value.map((team) => {
        const contracts = contractsByTeam.value.get(team.id) ?? []
        const addresses = contracts.map(c => c.address)
        return {
          queryKey: ['team-balance-recap', { teamId: team.id, addresses }],
          queryFn: async (): Promise<ContractBalance[]> => {
            if (!client.value || addresses.length === 0) return []

            const nativeCalls = addresses.map(address => ({
              address: MULTICALL3 as Address,
              abi: MULTICALL3_ABI,
              functionName: 'getEthBalance',
              args: [address]
            }))
            const tokenCalls = addresses.flatMap(address =>
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
            const val = (i: number) => {
              const r = results[i]
              return r && r.status === 'success' ? (r.result as bigint) : 0n
            }
            return contracts.map((contract, a) => ({
              address: contract.address,
              type: contract.type,
              native: val(a),
              tokens: TOKENS.map((token, t) => ({
                symbol: token.symbol,
                decimals: token.decimals,
                raw: val(addresses.length + a * TOKENS.length + t)
              }))
            }))
          },
          enabled: addresses.length > 0 && !!client.value,
          refetchOnWindowFocus: false,
          staleTime: 1000 * 30
        }
      })
    )
  })

  const recaps = computed(() => {
    const map = new Map<number, TeamBalanceBreakdown>()
    teamList.value.forEach((team, i) => {
      const contracts = contractsByTeam.value.get(team.id) ?? []
      if (contracts.length === 0) {
        map.set(team.id, EMPTY)
        return
      }
      const query = balanceQueries.value[i]
      const balances = (query?.data ?? []) as ContractBalance[]
      const totalStableValue = balances.reduce(
        (sum, c) =>
          sum + c.tokens.reduce((s, t) => s + Number(formatUnits(t.raw, t.decimals)), 0),
        0
      )
      map.set(team.id, {
        loading: query?.isLoading ?? false,
        contracts: balances,
        totalStableValue
      })
    })
    return map
  })

  const get = (teamId: number): TeamBalanceBreakdown => recaps.value.get(teamId) ?? EMPTY

  return { recaps, get }
}

// Helper for cells: does a contract hold anything?
export const formatNative = (raw: bigint) =>
  Number(formatEther(raw)).toLocaleString(undefined, { maximumFractionDigits: 2 })
export const formatToken = (amount: TokenAmount) =>
  Number(formatUnits(amount.raw, amount.decimals)).toLocaleString(undefined, {
    maximumFractionDigits: 2
  })
