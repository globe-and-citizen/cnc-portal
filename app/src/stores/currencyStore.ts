import { useStorage } from '@vueuse/core'
import { defineStore } from 'pinia'

interface Currency {
  code: string
  name: string
  symbol: string
}
export const LIST_CURRENCIES: Currency[] = [
  {
    code: 'USD',
    name: 'US Dollar',
    symbol: '$'
  },
  {
    code: 'EUR',
    name: 'Euro',
    symbol: '€'
  },
  {
    code: 'CAD',
    name: 'Canadian Dollar',
    symbol: 'CA$'
  },
  {
    code: 'XOF',
    name: 'West African CFA franc',
    symbol: 'CFA'
  },
  {
    code: 'IDR',
    name: 'Indonesian Rupiah',
    symbol: 'Rp'
  },
  {
    code: 'INR',
    name: 'Indian Rupee',
    symbol: '₹'
  }
]
export const useCurrencyStore = defineStore('currency', () => {
  const currency = useStorage('currency', {
    code: 'USD',
    name: 'US Dollar',
    symbol: '$'
  })

  function setCurrency(value: string) {
    currency.value = LIST_CURRENCIES.find((c) => c.code === value)
  }

  return {
    currency,
    setCurrency
  }
})
