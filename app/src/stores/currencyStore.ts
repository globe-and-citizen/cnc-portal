import { useStorage } from '@vueuse/core'
import { defineStore } from 'pinia'

export const LIST_CURRENCIES = ['USD', 'EUR', 'CAD', 'XOF', 'IDR', 'INR']
export const useCurrencyStore = defineStore('currency', () => {
  const currency = useStorage('currency', 'USD')

  function setCurrency(value: string) {
    currency.value = value
  }

  return {
    currency,
    setCurrency
  }
})
