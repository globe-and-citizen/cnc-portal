import { ref, onMounted, onUnmounted } from 'vue'

interface CoinPrices {
  [key: string]: {
    usd: number
    usd_24h_change?: number
  }
}

export function useCryptoPrice(coins: string[]) {
  const prices = ref<CoinPrices>({})
  const loading = ref(false)
  const error = ref<string | null>(null)
  let intervalId: NodeJS.Timeout | null = null

  const fetchPrices = async () => {
    try {
      loading.value = true
      error.value = null
      const coinIds = coins.join(',')
      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${coinIds}&vs_currencies=usd&include_24hr_change=true`
      )
      if (!response.ok) throw new Error('Failed to fetch prices')
      prices.value = await response.json()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch prices'
      console.error('Error fetching crypto prices:', err)
    } finally {
      loading.value = false
    }
  }

  onMounted(() => {
    fetchPrices()
    intervalId = setInterval(fetchPrices, 60000)
  })

  onUnmounted(() => {
    if (intervalId) clearInterval(intervalId)
  })

  return {
    prices,
    loading,
    error,
    fetchPrices
  }
}
