import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAppStore = defineStore('app', () => {
  const showAddTeamModal = ref(false)

  const setShowAddTeamModal = (value: boolean) => {
    showAddTeamModal.value = value
  }

  return {
    showAddTeamModal,
    setShowAddTeamModal
  }
})
