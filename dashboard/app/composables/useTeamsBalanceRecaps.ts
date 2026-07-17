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

// One Officer generation's value-holding contracts, with their balances.
export interface GenerationBalance {
  officerId: number
  version: string | null
  isCurrent: boolean
  officerAddress: Address
  contracts: ContractBalance[]
}

export interface TeamBalanceBreakdown {
  loading: boolean
  generations: GenerationBalance[]
  // Officer-less contracts (Safe, SafeDepositRouter): version-independent.
  shared: ContractBalance[]
  // Sort key: summed stablecoin value (all ~1 USD) across everything.
  totalStableValue: number
}

const EMPTY: TeamBalanceBreakdown = {
  loading: false,
  generations: [],
  shared: [],
  totalStableValue: 0
}

type AddressBalance = { native: bigint, tokens: TokenAmount[] }

/**
 * List-level balance recap for every team, GROUPED BY OFFICER VERSION. Each
 * generation lists its value-holding contracts + native/stablecoin balances, so
 * it's clear which balance belongs to which version (current vs legacy). One
 * officers fetch + one balance multicall per team, cached and shared with cells.
 */
export const useTeamsBalanceRecaps = (teams: MaybeRefOrGetter<Team[]>) => {
  const chainId = Number(useRuntimeConfig().public.chainId)
  const client = useClient({ chainId })

  const teamList = computed(() => toValue(teams) ?? [])

  const officerQueries = useQueries({
    queries: computed(() =>
      teamList.value.map(team => ({
        queryKey: ['team-officers', { teamId: team.id }],
        queryFn: async () => await getTeamOfficers(team.id),
        staleTime: 1000 * 60 * 5
      }))
    )
  })

  // Per team: Officer generations that own ≥1 value-holding contract.
  const generationsByTeam = computed(() => {
    const map = new Map<number, {
      officerId: number
      version: string | null
      isCurrent: boolean
      officerAddress: Address
      contracts: { address: Address, type: string }[]
    }[]>()
    teamList.value.forEach((team, i) => {
      const groups = (officerQueries.value[i]?.data ?? [])
        .map(officer => ({
          officerId: officer.id,
          version: officer.version,
          isCurrent: officer.isCurrent,
          officerAddress: officer.address as Address,
          contracts: (officer.contracts ?? [])
            .filter(c => VALUE_HOLDING_TYPES.has(c.type))
            .map(c => ({ address: c.address as Address, type: c.type }))
        }))
        .filter(g => g.contracts.length > 0)
      map.set(team.id, groups)
    })
    return map
  })

  // Officer-less value-holding contracts (Safe) exposed on the list payload.
  const sharedByTeam = computed(() => {
    const map = new Map<number, { address: Address, type: string }[]>()
    teamList.value.forEach((team) => {
      const contracts = (team.teamContracts ?? [])
        .filter(c => c.officerId === null && VALUE_HOLDING_TYPES.has(c.type))
        .map(c => ({ address: c.address as Address, type: c.type }))
      map.set(team.id, contracts)
    })
    return map
  })

  // Distinct addresses to price per team (officer contracts + shared).
  const addressesByTeam = computed(() => {
    const map = new Map<number, Address[]>()
    teamList.value.forEach((team) => {
      const set = new Set<string>()
      for (const g of generationsByTeam.value.get(team.id) ?? []) {
        g.contracts.forEach(c => set.add(c.address.toLowerCase()))
      }
      for (const c of sharedByTeam.value.get(team.id) ?? []) {
        set.add(c.address.toLowerCase())
      }
      map.set(team.id, [...set] as Address[])
    })
    return map
  })

  // One balance multicall per team → map of address → balances.
  const balanceQueries = useQueries({
    queries: computed(() =>
      teamList.value.map((team) => {
        const addresses = addressesByTeam.value.get(team.id) ?? []
        return {
          queryKey: ['team-balance-recap', { teamId: team.id, addresses }],
          queryFn: async (): Promise<Record<string, AddressBalance>> => {
            if (!client.value || addresses.length === 0) return {}
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
            const out: Record<string, AddressBalance> = {}
            addresses.forEach((address, a) => {
              out[address.toLowerCase()] = {
                native: val(a),
                tokens: TOKENS.map((token, t) => ({
                  symbol: token.symbol,
                  decimals: token.decimals,
                  raw: val(addresses.length + a * TOKENS.length + t)
                }))
              }
            })
            return out
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
      const groups = generationsByTeam.value.get(team.id) ?? []
      const sharedList = sharedByTeam.value.get(team.id) ?? []
      if (groups.length === 0 && sharedList.length === 0) {
        map.set(team.id, EMPTY)
        return
      }
      const query = balanceQueries.value[i]
      const balances = (query?.data ?? {}) as Record<string, AddressBalance>
      const zero = (): AddressBalance => ({
        native: 0n,
        tokens: TOKENS.map(t => ({ symbol: t.symbol, decimals: t.decimals, raw: 0n }))
      })

      let totalStableValue = 0
      const resolve = (contract: { address: Address, type: string }): ContractBalance => {
        const bal = balances[contract.address.toLowerCase()] ?? zero()
        totalStableValue += bal.tokens.reduce(
          (s, t) => s + Number(formatUnits(t.raw, t.decimals)),
          0
        )
        return { address: contract.address, type: contract.type, native: bal.native, tokens: bal.tokens }
      }

      const generations: GenerationBalance[] = groups.map(group => ({
        officerId: group.officerId,
        version: group.version,
        isCurrent: group.isCurrent,
        officerAddress: group.officerAddress,
        contracts: group.contracts.map(resolve)
      }))
      const shared = sharedList.map(resolve)

      map.set(team.id, {
        loading: query?.isLoading ?? false,
        generations,
        shared,
        totalStableValue
      })
    })
    return map
  })

  const get = (teamId: number): TeamBalanceBreakdown => recaps.value.get(teamId) ?? EMPTY

  return { recaps, get }
}

// Format a positive amount to 2 decimals, but surface dust that would otherwise
// round to a misleading "0" as "<0.01" so it's not mistaken for empty.
const formatAmount = (value: number) => {
  if (value > 0 && value < 0.01) return '<0.01'
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 })
}

export const formatNative = (raw: bigint) => formatAmount(Number(formatEther(raw)))
export const formatToken = (amount: TokenAmount) =>
  formatAmount(Number(formatUnits(amount.raw, amount.decimals)))
