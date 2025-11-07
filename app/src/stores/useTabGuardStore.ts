import { defineStore } from 'pinia'
import router from '@/router'
import { ref } from 'vue'

const RETURN_PATH_KEY = 'app_last_path'
const LOCK_TIMESTAMP_KEY = 'app_lock_timestamp'
const TAB_HEARTBEAT_KEY = 'app_tab_heartbeats'
const HEARTBEAT_INTERVAL = 5000 // update every 5s
const CLEANUP_INTERVAL = 10000 // cleanup every 10s
const HEARTBEAT_TIMEOUT = 15000 // consider tab dead after 15s

interface DevToolsEvent extends CustomEvent {
  detail: {
    isOpen: boolean
  }
}

export const useTabGuardStore = defineStore('tabGuard', () => {
  const isLocked = ref(false)
  const tabId = crypto.randomUUID()
  let heartbeatTimer: number | undefined
  let cleanupTimer: number | undefined

  // ---- Helpers ----
  function getActiveHeartbeats(): Record<string, number> {
    try {
      return JSON.parse(localStorage.getItem(TAB_HEARTBEAT_KEY) || '{}')
    } catch {
      return {}
    }
  }

  function saveHeartbeats(heartbeats: Record<string, number>) {
    localStorage.setItem(TAB_HEARTBEAT_KEY, JSON.stringify(heartbeats))
  }

  // ---- Heartbeat Management ----
  function updateHeartbeat() {
    const heartbeats = getActiveHeartbeats()
    heartbeats[tabId] = Date.now()
    saveHeartbeats(heartbeats)
  }

  function cleanupStaleHeartbeats() {
    const heartbeats = getActiveHeartbeats()
    const now = Date.now()
    let changed = false

    for (const [id, timestamp] of Object.entries(heartbeats)) {
      if (now - timestamp > HEARTBEAT_TIMEOUT) {
        delete heartbeats[id]
        changed = true
      }
    }

    if (changed) saveHeartbeats(heartbeats)
    evaluateLockState(heartbeats)
  }

  // ---- Lock Handling ----
  function evaluateLockState(heartbeats?: Record<string, number>) {
    const activeTabs = Object.keys(heartbeats || getActiveHeartbeats()).length
    const lockTimestamp = localStorage.getItem(LOCK_TIMESTAMP_KEY)
    const routeName = router.currentRoute.value.name

    // If a lock timestamp exists, always force LockedView
    if (lockTimestamp && routeName !== 'LockedView') {
      void router.replace({ name: 'LockedView' })
      return
    }

    // More than one tab → lock
    if (activeTabs > 1) {
      if (routeName !== 'LockedView') {
        sessionStorage.setItem(RETURN_PATH_KEY, router.currentRoute.value.fullPath)
        localStorage.setItem(LOCK_TIMESTAMP_KEY, Date.now().toString())
        isLocked.value = true
        void router.replace({ name: 'LockedView' })
      }
    } else if (routeName === 'LockedView') {
      // Return to previous route
      const returnPath = sessionStorage.getItem(RETURN_PATH_KEY)
      sessionStorage.removeItem(RETURN_PATH_KEY)
      localStorage.removeItem(LOCK_TIMESTAMP_KEY)
      isLocked.value = false
      void router.replace(returnPath || { name: 'home' })
    }
  }

  // ---- Heartbeat Loop ----
  function startHeartbeat() {
    updateHeartbeat()
    setTimeout(cleanupStaleHeartbeats, 2000) // let other tabs sync first

    heartbeatTimer = window.setInterval(updateHeartbeat, HEARTBEAT_INTERVAL)
    cleanupTimer = window.setInterval(cleanupStaleHeartbeats, CLEANUP_INTERVAL)
  }

  function stopHeartbeat() {
    if (heartbeatTimer) clearInterval(heartbeatTimer)
    if (cleanupTimer) clearInterval(cleanupTimer)

    const heartbeats = getActiveHeartbeats()
    delete heartbeats[tabId]
    saveHeartbeats(heartbeats)
    cleanupStaleHeartbeats()
  }

  // ---- DevTools Protection ----
  function preventDevTools() {
    const interval = setInterval(() => {
      const check = /./
      check.toString = () => {
        clearInterval(interval)
        return ''
      }
      console.log(check)
    }, 100)

    window.addEventListener('devtoolschange', ((event: DevToolsEvent) => {
      if (event.detail.isOpen) {
        void router.replace({ name: 'LockedView' })
      }
    }) as EventListener)
  }

  // ---- Init ----
  function init() {
    preventDevTools()
    startHeartbeat()

    // React to localStorage changes with debounce
    let debounceTimer: number | undefined
    window.addEventListener('storage', (event) => {
      if (event.key === TAB_HEARTBEAT_KEY) {
        if (debounceTimer) clearTimeout(debounceTimer)
        debounceTimer = window.setTimeout(() => {
          cleanupStaleHeartbeats()
        }, 300)
      }
    })

    // Cleanup on tab close
    window.addEventListener('beforeunload', stopHeartbeat)
  }

  // ---- Return pattern ----
  return {
    init,
    isLocked,
    _getActiveHeartbeats: getActiveHeartbeats
  }
})
