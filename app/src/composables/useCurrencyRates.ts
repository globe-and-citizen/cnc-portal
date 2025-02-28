import { ref, computed } from 'vue'

// Define static conversion rates (you might want to fetch these from an API in production)
const USD_TO_CAD_RATE = 1.28
const USD_TO_INR_RATE = 83.12
const USD_TO_EUR_RATE = 0.92

export function useCurrencyRates() {
  const loading = ref(false)
  const error = ref<string | null>(null)

  // You could implement real API calls here to get live rates
  const getRate = (currency: string): number => {
    switch (currency.toUpperCase()) {
      case 'USD':
        return 1
      case 'CAD':
        return USD_TO_CAD_RATE
      case 'INR':
        return USD_TO_INR_RATE
      case 'EUR':
        return USD_TO_EUR_RATE
      default:
        return 1
    }
  }

  // Return the composable interface
  return {
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    getRate
  }
}
