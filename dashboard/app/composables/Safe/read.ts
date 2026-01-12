import { unref, computed, type MaybeRef } from 'vue'
import { formatUnits } from 'viem'
import { useQuery } from '@tanstack/vue-query'
import { getChainId } from '@/constant/index'
import type { Safe, SafeBalanceItem, SafeTx } from '@/types/safe'

export const TX_SERVICE_BY_CHAIN: Record<number, { chain: string, url: string, nativeSymbol: string }> = {
  137: { chain: 'polygon', url: 'https://api.safe.global/tx-service/pol', nativeSymbol: 'POL' },
  11155111: { chain: 'sep', url: 'https://api.safe.global/tx-service/sep', nativeSymbol: 'ETH' },
  80002: { chain: 'matic', url: 'https://api.safe.global/tx-service/matic', nativeSymbol: 'MATIC' },
  42161: { chain: 'arbitrum', url: 'https://api.safe.global/tx-service/arbitrum', nativeSymbol: 'ETH' }
}

async function fetchNativeBalance(txServiceUrl: string, safeAddress: string, nativeSymbol: string) {
  try {
    const res = await fetch(`${txServiceUrl}/api/v1/safes/${safeAddress}/balances/`)
    if (!res.ok) throw new Error('Failed to fetch balance')
    const data: SafeBalanceItem[] = await res.json()
    const native = data.find(item => item.tokenAddress === null)
    if (!native) throw new Error('No native balance found')
    const decimals = native.token?.decimals ?? 18
    const symbol = native.token?.symbol || nativeSymbol
    const balance = formatUnits(BigInt(native.balance || '0'), decimals)
    return { balance, symbol }
  } catch {
    return { balance: '0', symbol: nativeSymbol }
  }
}

export function useSafes(ownerAddress: MaybeRef<string | undefined>) {
  const addressRef = computed(() => unref(ownerAddress))

  const safesQuery = useQuery<Safe[]>({
    queryKey: computed(() => ['safes', addressRef.value, getChainId()]),
    enabled: computed(() => !!addressRef.value),
    queryFn: async () => {
      const address = addressRef.value
      if (!address) throw new Error('No address provided')

      const chainId = getChainId()
      const txService = TX_SERVICE_BY_CHAIN[chainId]
      if (!txService) throw new Error(`Unsupported chainId: ${chainId}`)

      const res = await fetch(`${txService.url}/api/v1/owners/${address}/safes/`)
      if (!res.ok) throw new Error(`Failed to fetch safes for chain ${txService.chain}`)

      const data: { safes: string[] } = await res.json()
      const safeAddresses = data.safes ?? []

      const balances: {
        addr: string
        balanceData: { balance: string, symbol: string }
      }[] = []

      for (const addr of safeAddresses) {
        const balanceData = await fetchNativeBalance(
          txService.url,
          addr,
          txService.nativeSymbol
        )

        balances.push({ addr, balanceData })

        // tiny delay so Safe API doesn't rate-limit you
        await new Promise(resolve => setTimeout(resolve, 200))
      }

      return balances.map(({ addr, balanceData }) => ({
        address: addr,
        chain: txService.chain,
        balance: balanceData.balance,
        symbol: balanceData.symbol
      }))
    },
    staleTime: 30_000,
    gcTime: 300_000,
    refetchOnWindowFocus: false
  })

  const safes = computed(() => safesQuery.data.value ?? [])
  const isLoading = computed(() => safesQuery.isLoading.value || safesQuery.isFetching.value)
  const error = computed<string | null>(() => {
    const err = safesQuery.error.value
    if (!err) return null
    return err instanceof Error ? err.message : 'Failed to fetch safes'
  })

  const fetchSafes = () => safesQuery.refetch()

  return { safes, isLoading, error, fetchSafes }
}

async function getSafeTransactions(
  safeAddress: string,
  executed: boolean
) {
  const chainId = getChainId()
  const txService = TX_SERVICE_BY_CHAIN[chainId]
  if (!txService) throw new Error(`Unsupported chainId: ${chainId}`)

  const res = await fetch(
    `${txService.url}/api/v1/safes/${safeAddress}/multisig-transactions/?executed=${executed}`
  )

  if (!res.ok) {
    throw new Error(
      executed
        ? 'Failed to fetch executed transactions'
        : 'Failed to fetch pending transactions'
    )
  }

  const data = await res.json()
  return data.results || []
}

export function useSafeTransactions(params: {
  safeAddress: MaybeRef<string | undefined>
  executed: MaybeRef<boolean>
  enabled?: MaybeRef<boolean>
}) {
  const addressRef = computed(() => unref(params.safeAddress))
  const executedRef = computed(() => unref(params.executed))
  const enabledRef = computed(() => {
    const userEnabled = params.enabled ? unref(params.enabled) : true
    return !!addressRef.value && userEnabled
  })

  const txQuery = useQuery<SafeTx[]>({
    queryKey: computed(() => ['safeTxs', addressRef.value, executedRef.value]),
    enabled: enabledRef,
    queryFn: async () => {
      const address = addressRef.value
      if (!address) throw new Error('No address provided')
      return getSafeTransactions(address, executedRef.value)
    },
    staleTime: 15_000,
    refetchOnWindowFocus: false
  })

  const txs = computed(() => txQuery.data.value ?? [])
  const loading = computed(
    () => txQuery.isLoading.value || txQuery.isFetching.value
  )
  const error = computed<string | null>(() => {
    const err = txQuery.error.value
    if (!err) return null
    return err instanceof Error ? err.message : 'Failed to fetch transactions'
  })
  const refetch = () => txQuery.refetch()
  return { txs, loading, error, refetch }
}

export function txUrl(tx: { transactionHash?: string }) {
  if (!tx.transactionHash) return '#'

  const chainId = getChainId()

  switch (chainId) {
    case 137: // Polygon
      return `https://polygonscan.com/tx/${tx.transactionHash}`
    case 80001: // Mumbai
      return `https://mumbai.polygonscan.com/tx/${tx.transactionHash}`
    case 42161: // Arbitrum
      return `https://arbiscan.io/tx/${tx.transactionHash}`
    case 11155111: // Sepolia
    default:
      return `https://sepolia.etherscan.io/tx/${tx.transactionHash}`
  }
}
