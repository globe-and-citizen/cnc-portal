import { defineStore } from 'pinia'
import { ref } from 'vue'

const TAB_COUNT_KEY = 'app_open_tabs'

export const useTabGuardStore = defineStore('tabGuard', () => {
  // expose the number of open tabs for per-tab decisions
  const openTabs = ref(0)
  // ---- Helpers ----------------------------------------------------
  function ensureKeyExists() {
    if (!localStorage.getItem(TAB_COUNT_KEY)) {
      localStorage.setItem(TAB_COUNT_KEY, '0')
    }
  }

  function incrementTabCount() {
    ensureKeyExists()
    const current = Number(localStorage.getItem(TAB_COUNT_KEY) || 0)
    localStorage.setItem(TAB_COUNT_KEY, String(current + 1))
  }

  function decrementTabCount() {
    ensureKeyExists()
    const current = Number(localStorage.getItem(TAB_COUNT_KEY) || 0)
    localStorage.setItem(TAB_COUNT_KEY, String(Math.max(0, current - 1)))
  }

  function evaluateLockState() {
    const count = Number(localStorage.getItem(TAB_COUNT_KEY) || 0)
    openTabs.value = count
  }

  // ---- Public initialization method -------------------------------
  function init() {
    ensureKeyExists()
    incrementTabCount()

    // Decrement when tab closes
    window.addEventListener('beforeunload', () => {
      decrementTabCount()
    })

    // React to cross-tab storage events
    window.addEventListener('storage', (event) => {
      if (event.key === TAB_COUNT_KEY) {
        if (event.newValue === null || event.newValue === 'NaN') {
          // Key cleared (e.g., after logout)
          localStorage.setItem(TAB_COUNT_KEY, '1')
        }
        evaluateLockState()
      }
    })

    // Initial check
    evaluateLockState()
  }

  return { init, openTabs }
})
