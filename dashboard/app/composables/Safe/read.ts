import { ref, unref, type MaybeRef } from 'vue'
import { formatUnits } from 'viem'
import { getChainId } from '@/constant/index'

interface Safe {
  address: string
  chain: string
  balance: string
  symbol: string
}

const TX_SERVICE_BY_CHAIN: Record<number, { chain: string, url: string, nativeSymbol: string }> = {
  137: { chain: 'polygon', url: 'https://api.safe.global/tx-service/pol', nativeSymbol: 'POL' },
  11155111: { chain: 'sep', url: 'https://api.safe.global/tx-service/sep', nativeSymbol: 'ETH' },
  80002: { chain: 'matic', url: 'https://api.safe.global/tx-service/matic', nativeSymbol: 'MATIC' },
  42161: { chain: 'arbitrum', url: 'https://api.safe.global/tx-service/arbitrum', nativeSymbol: 'ETH' }
}

type SafeBalanceItem = {
  tokenAddress: string | null
  token?: {
    symbol?: string | null
    decimals?: number | null
  } | null
  balance: string
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
  const safes = ref<Safe[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const fetchSafes = async () => {
    const address = unref(ownerAddress)
    if (!address) {
      error.value = 'No address provided'
      safes.value = []
      return
    }

    isLoading.value = true
    error.value = null

    try {
      const chainId = getChainId()
      const txService = TX_SERVICE_BY_CHAIN[chainId]
      if (!txService) {
        error.value = `Unsupported chainId: ${chainId}`
        safes.value = []
        return
      }

      const res = await fetch(`${txService.url}/api/v1/owners/${address}/safes/`)
      if (!res.ok) {
        error.value = `Failed to fetch safes for chain ${txService.chain}`
        safes.value = []
        return
      }

      const data: { safes: string[] } = await res.json()
      const safeAddresses = data.safes ?? []

      // Fetch balances for each safe (sequentially)
      const results: Safe[] = []
      for (const addr of safeAddresses) {
        const balanceData = await fetchNativeBalance(txService.url, addr, txService.nativeSymbol)
        results.push({
          address: addr,
          chain: txService.chain,
          balance: balanceData.balance,
          symbol: balanceData.symbol
        })
      }
      safes.value = results
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch safes'
      safes.value = []
    } finally {
      isLoading.value = false
    }
  }

  return { safes, isLoading, error, fetchSafes }
}
