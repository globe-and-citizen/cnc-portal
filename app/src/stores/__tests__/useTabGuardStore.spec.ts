import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useTabGuardStore } from '@/stores/useTabGuardStore'

const TAB_HEARTBEAT_KEY = 'app_tab_heartbeats'
const RETURN_PATH_KEY = 'app_last_path'
const LOCK_TIMESTAMP_KEY = 'app_lock_timestamp'

// Mock crypto.randomUUID
const mockUUID = '123e4567-e89b-12d3-a456-426614174000'
vi.stubGlobal('crypto', {
  randomUUID: () => mockUUID
})

// Hoisted mocks
const { replaceMock, isReadyMock, currentRoute } = vi.hoisted(() => ({
  replaceMock: vi.fn(),
  isReadyMock: vi.fn(),
  currentRoute: { value: { name: 'home', fullPath: '/home' } }
}))

// Mock router
vi.mock('@/router', () => ({
  default: {
    replace: replaceMock,
    isReady: isReadyMock,
    currentRoute
  }
}))

describe('useTabGuardStore', () => {
  let tabGuardStore: ReturnType<typeof useTabGuardStore>
  let storageListeners: Array<(event: StorageEvent) => void>
  let beforeUnloadListeners: Array<(event: Event) => void>

  beforeEach(() => {
    setActivePinia(createPinia())
    tabGuardStore = useTabGuardStore()

    localStorage.clear()
    sessionStorage.clear()
    vi.useFakeTimers()

    storageListeners = []
    beforeUnloadListeners = []

    currentRoute.value = { name: 'home', fullPath: '/home' }

    replaceMock.mockReset()
    replaceMock.mockResolvedValue(undefined)

    isReadyMock.mockReset()
    isReadyMock.mockResolvedValue(undefined)

    // Mock addEventListener
    vi.spyOn(window, 'addEventListener').mockImplementation((type, listener) => {
      if (type === 'storage') {
        storageListeners.push(listener as (event: StorageEvent) => void)
      }
      if (type === 'beforeunload') {
        beforeUnloadListeners.push(listener as (event: Event) => void)
      }
    })

    // Mock setInterval and clearInterval
    vi.spyOn(window, 'setInterval').mockReturnValue(1 as unknown as NodeJS.Timeout)
    vi.spyOn(window, 'clearInterval').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
  })

  describe('Initialization', () => {
    it('should initialize heartbeat on init', () => {
      tabGuardStore.init()

      const heartbeats = tabGuardStore._getActiveHeartbeats()
      expect(heartbeats[mockUUID]).toBeDefined()
      expect(Object.keys(heartbeats)).toHaveLength(1)
    })

    it.skip('should start heartbeat intervals', () => {
      tabGuardStore.init()
      expect(window.setInterval).toHaveBeenCalledTimes(2)
    })
  })

  describe('Heartbeat Management', () => {
    it('should update heartbeat timestamp', () => {
      tabGuardStore.init()
      const now = Date.now()
      vi.setSystemTime(now)

      const heartbeats = tabGuardStore._getActiveHeartbeats()
      expect(heartbeats[mockUUID]).toBe(now)
    })

    it('should cleanup stale heartbeats', () => {
      const staleTimestamp = Date.now() - 20000 // older than HEARTBEAT_TIMEOUT
      localStorage.setItem(
        TAB_HEARTBEAT_KEY,
        JSON.stringify({
          [mockUUID]: staleTimestamp,
          'other-tab': staleTimestamp
        })
      )

      tabGuardStore.init()
      vi.advanceTimersByTime(2000) // trigger initial cleanup

      const heartbeats = tabGuardStore._getActiveHeartbeats()
      expect(Object.keys(heartbeats)).toHaveLength(1)
      expect(heartbeats[mockUUID]).toBeDefined()
    })
  })

  describe('Lock Management', () => {
    it('should lock when multiple tabs are detected', () => {
      const currentPath = '/teams/1'
      currentRoute.value = { name: 'home', fullPath: currentPath }

      tabGuardStore.init()
      localStorage.setItem(
        TAB_HEARTBEAT_KEY,
        JSON.stringify({
          [mockUUID]: Date.now(),
          'other-tab': Date.now()
        })
      )

      vi.advanceTimersByTime(2000)

      expect(sessionStorage.getItem(RETURN_PATH_KEY)).toBe(currentPath)
      expect(localStorage.getItem(LOCK_TIMESTAMP_KEY)).toBeDefined()
      expect(replaceMock).toHaveBeenCalledWith({ name: 'LockedView' })
    })

    it('should unlock when returning to single tab', () => {
      currentRoute.value = { name: 'LockedView', fullPath: '/locked' }
      sessionStorage.setItem(RETURN_PATH_KEY, '/teams/2')
      localStorage.setItem(LOCK_TIMESTAMP_KEY, Date.now().toString())

      tabGuardStore.init()
      vi.advanceTimersByTime(2000)

      expect(replaceMock).toHaveBeenCalledWith('/teams/2')
      expect(sessionStorage.getItem(RETURN_PATH_KEY)).toBeNull()
      expect(localStorage.getItem(LOCK_TIMESTAMP_KEY)).toBeNull()
    })
  })

  describe('Cleanup', () => {
    it('should cleanup on tab close', () => {
      tabGuardStore.init()

      const unloadEvent = new Event('beforeunload')
      beforeUnloadListeners[0](unloadEvent)

      const heartbeats = tabGuardStore._getActiveHeartbeats()
      expect(heartbeats[mockUUID]).toBeUndefined()
    })

    it('should handle storage events', () => {
      tabGuardStore.init()

      const storageEvent = new StorageEvent('storage', {
        key: TAB_HEARTBEAT_KEY,
        newValue: JSON.stringify({ [mockUUID]: Date.now() })
      })

      storageListeners[0](storageEvent)
      vi.advanceTimersByTime(300) // debounce delay

      expect(replaceMock).not.toHaveBeenCalled()
    })
  })
})
