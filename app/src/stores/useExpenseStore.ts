import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useExpenseStore = defineStore('expense', () => {
  const reload = ref(false)

  const setReload = (state: boolean) => {
    reload.value = state
  }

  return {
    reload,
    setReload
  }
})
