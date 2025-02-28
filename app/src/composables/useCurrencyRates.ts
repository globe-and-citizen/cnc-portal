import { ref, computed } from 'vue'

interface ExchangeRates {
  [currency: string]: number
}

export function useCurrencyRates() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const rates = ref<ExchangeRates>({})

  const fetchRates = async () => {
    loading.value = true
    error.value = null

    try {
      const params = new URLSearchParams({
        apikey: 'fca_live_Ee3QsIH2QQUw3WCNypXcgeFzPXSxkWw1iEywJCeh',
        base_currency: 'USD',
        currencies: 'USD,CAD,INR,EUR'
      })

      const response = await fetch(`https://api.freecurrencyapi.com/v1/latest?${params}`)
      const data = await response.json()

      if (data.data) {
        rates.value = data.data
      } else {
        throw new Error('Failed to fetch exchange rates')
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch exchange rates'
    } finally {
      loading.value = false
    }
  }

  const getRate = (currency: string): number => {
    return rates.value[currency.toUpperCase()] || 1
  }

  // Fetch rates when the composable is initialized
  fetchRates()

  // Return the composable interface
  return {
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    getRate,
    fetchRates
  }
}
