import { defineStore } from 'pinia'
import router from '@/router'

const TAB_COUNT_KEY = 'app_open_tabs'
const RETURN_PATH_KEY = 'app_last_path'

export const useTabGuardStore = defineStore('tabGuard', () => {
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
    const openTabs = Number(localStorage.getItem(TAB_COUNT_KEY) || 0)

    if (openTabs > 1) {
      //  Multiple tabs detected → lock all
      if (router.currentRoute.value.name !== 'LockedView') {
        sessionStorage.setItem(RETURN_PATH_KEY, router.currentRoute.value.fullPath)
        void router.replace({ name: 'LockedView' }).catch(() => {})
      }
    } else {
      //  Single tab → unlock
      if (router.currentRoute.value.name === 'LockedView') {
        const returnPath = sessionStorage.getItem(RETURN_PATH_KEY)
        sessionStorage.removeItem(RETURN_PATH_KEY)
        void router.replace(returnPath || { name: 'home' }).catch(() => {})
      }
    }
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

    // Track last route to restore after unlock
    router.afterEach((to) => {
      if (to.name !== 'LockedView') {
        sessionStorage.setItem(RETURN_PATH_KEY, to.fullPath)
      }
    })

    // Initial check
    router.isReady().then(evaluateLockState)
  }

  return { init }
})
