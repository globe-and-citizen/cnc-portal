import { defineStore } from 'pinia'
import { onUnmounted, ref } from 'vue'
import router from '@/router'

const LOCK_KEY = 'app_active_tab_id'
const BEAT_KEY = 'app_active_tab_beat'
const RETURN_PATH_KEY = 'app_tab_guard_return_path'
const STALE_MS = 4000
const MONITOR_INTERVAL = 1000

export const useTabGuardStore = defineStore('tabGuard', () => {
  const isActiveTab = ref(true)
  const tabId = crypto.randomUUID()
  let beatTimer: ReturnType<typeof setInterval> | undefined
  let monitorTimer: ReturnType<typeof setInterval> | undefined

  function now() {
    return Date.now()
  }

  function startHeartbeat() {
    stopHeartbeat()
    // Refresh our heartbeat while we own the lock so other tabs can detect when we go stale.
    beatTimer = setInterval(() => {
      if (localStorage.getItem(LOCK_KEY) === tabId) {
        localStorage.setItem(BEAT_KEY, String(now()))
      } else {
        stopHeartbeat()
      }
    }, 1000)
  }

  function stopHeartbeat() {
    if (beatTimer != null) {
      clearInterval(beatTimer)
      beatTimer = undefined
    }
  }

  function startMonitor() {
    stopMonitor()
    // When this tab is locked out, poll for a stale owner and reclaim the session once safe.
    monitorTimer = setInterval(() => {
      if (isActiveTab.value) return

      const currentOwner = localStorage.getItem(LOCK_KEY)
      const lastBeat = Number(localStorage.getItem(BEAT_KEY) || 0)
      const stale = !currentOwner || now() - lastBeat > STALE_MS

      if (stale) {
        claimLockIfPossible(true)
      }
    }, MONITOR_INTERVAL)
  }

  function stopMonitor() {
    if (monitorTimer != null) {
      clearInterval(monitorTimer)
      monitorTimer = undefined
    }
  }

  function navigateToLocked() {
    if (router.currentRoute.value.name === 'LockedView') return
    // Stash the current route so we can resume from the same screen after unlocking.
    sessionStorage.setItem(RETURN_PATH_KEY, router.currentRoute.value.fullPath)
    void router.replace({ name: 'LockedView' }).catch(() => {})
  }

  function navigateBack() {
    const storedPath = sessionStorage.getItem(RETURN_PATH_KEY)
    if (storedPath) {
      sessionStorage.removeItem(RETURN_PATH_KEY)
      void router.replace(storedPath).catch(() => {
        void router.replace({ name: 'home' }).catch(() => {})
      })
      return
    }

    if (router.currentRoute.value.name === 'LockedView') {
      void router.replace({ name: 'home' }).catch(() => {})
    }
  }

  function claimLockIfPossible(force = false) {
    const currentOwner = localStorage.getItem(LOCK_KEY)
    const lastBeat = Number(localStorage.getItem(BEAT_KEY) || 0)
    const ownerMissing = !currentOwner
    const isOwner = currentOwner === tabId
    const stale = now() - lastBeat > STALE_MS

    if (force || ownerMissing || isOwner || stale) {
      // We can safely assume ownership; restart the heartbeat and return the user to their route.
      const wasInactive = !isActiveTab.value
      localStorage.setItem(LOCK_KEY, tabId)
      localStorage.setItem(BEAT_KEY, String(now()))
      isActiveTab.value = true
      startHeartbeat()
      if (wasInactive) navigateBack()
      return
    }

    if (!isOwner) {
      if (isActiveTab.value) {
        isActiveTab.value = false
        stopHeartbeat()
      }
      navigateToLocked()
    }
  }

  window.addEventListener('storage', (event) => {
    if (event.key === LOCK_KEY) {
      const owner = localStorage.getItem(LOCK_KEY)
      if (owner === tabId) {
        // Another tab released the lock; activate this tab and restore navigation if needed.
        const wasInactive = !isActiveTab.value
        isActiveTab.value = true
        startHeartbeat()
        if (wasInactive) navigateBack()
      } else if (owner) {
        // A different tab took control; demote this tab and display the locked view.
        if (isActiveTab.value) {
          isActiveTab.value = false
          stopHeartbeat()
        }
        navigateToLocked()
      } else {
        claimLockIfPossible()
      }
    }
  })

  window.addEventListener('beforeunload', () => {
    if (localStorage.getItem(LOCK_KEY) === tabId) {
      localStorage.removeItem(LOCK_KEY)
      localStorage.removeItem(BEAT_KEY)
    }
  })

  claimLockIfPossible()
  startMonitor()

  onUnmounted(() => {
    stopHeartbeat()
    stopMonitor()
  })

  return { isActiveTab }
})
