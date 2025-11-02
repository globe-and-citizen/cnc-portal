import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useTabGuardStore } from '@/stores/useTabGuardStore'

const TAB_COUNT_KEY = 'app_open_tabs'
const RETURN_PATH_KEY = 'app_last_path'

type AfterEachCallback = (to: { name?: string | null; fullPath: string }) => void
type StorageEventLike = { key: string | null; newValue: string | null }
type StorageListener = (event: StorageEventLike) => void
type BeforeUnloadListener = (event: Event) => void

const { replaceMock, isReadyMock, afterEachMock, currentRoute } = vi.hoisted(() => ({
  replaceMock: vi.fn(),
  isReadyMock: vi.fn(),
  afterEachMock: vi.fn<(cb: AfterEachCallback) => void>(),
  currentRoute: { value: { name: 'home', fullPath: '/home' } }
}))

vi.mock('@/router', () => ({
  default: {
    replace: replaceMock,
    isReady: isReadyMock,
    afterEach: afterEachMock,
    currentRoute
  }
}))

const originalAddEventListener = window.addEventListener

describe('useTabGuardStore', () => {
  let tabGuardStore: ReturnType<typeof useTabGuardStore>
  let storageListeners: StorageListener[]
  let beforeUnloadListeners: BeforeUnloadListener[]
  let afterEachCallbacks: AfterEachCallback[]

  beforeEach(() => {
    setActivePinia(createPinia())
    tabGuardStore = useTabGuardStore()

    localStorage.clear()
    sessionStorage.clear()

    storageListeners = []
    beforeUnloadListeners = []
    afterEachCallbacks = []

    currentRoute.value = { name: 'home', fullPath: '/home' }

    replaceMock.mockReset()
    replaceMock.mockResolvedValue(undefined)

    isReadyMock.mockReset()
    isReadyMock.mockResolvedValue(undefined)

    afterEachMock.mockReset()
    afterEachMock.mockImplementation((callback: AfterEachCallback) => {
      afterEachCallbacks.push(callback)
    })

    vi.spyOn(window, 'addEventListener').mockImplementation(
      (
        type: string,
        listener: EventListenerOrEventListenerObject,
        options?: boolean | AddEventListenerOptions
      ) => {
        if (type === 'storage') {
          storageListeners.push(listener as unknown as StorageListener)
          return
        }
        if (type === 'beforeunload') {
          beforeUnloadListeners.push(listener as BeforeUnloadListener)
          return
        }
        originalAddEventListener.call(window, type, listener, options as AddEventListenerOptions)
      }
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('increments tab count on init and decrements on beforeunload', () => {
    tabGuardStore.init()

    expect(localStorage.getItem(TAB_COUNT_KEY)).toBe('1')
    expect(beforeUnloadListeners).toHaveLength(1)

    const unloadHandler = beforeUnloadListeners[0]
    expect(unloadHandler).toBeDefined()
    unloadHandler!(new Event('beforeunload'))

    expect(localStorage.getItem(TAB_COUNT_KEY)).toBe('0')
  })

  it('locks the app when multiple tabs are detected via storage events', () => {
    const currentPath = '/teams/1'
    currentRoute.value = { name: 'home', fullPath: currentPath }

    tabGuardStore.init()

    const storageHandler = storageListeners[0]
    expect(storageHandler).toBeDefined()

    localStorage.setItem(TAB_COUNT_KEY, '2')
    storageHandler!({ key: TAB_COUNT_KEY, newValue: '2' })

    expect(sessionStorage.getItem(RETURN_PATH_KEY)).toBe(currentPath)
    expect(replaceMock).toHaveBeenCalledWith({ name: 'LockedView' })
  })

  it('normalizes cleared storage values back to a single tab', () => {
    tabGuardStore.init()

    const storageHandler = storageListeners[0]
    expect(storageHandler).toBeDefined()

    localStorage.setItem(TAB_COUNT_KEY, '5')
    storageHandler!({ key: TAB_COUNT_KEY, newValue: null })

    expect(localStorage.getItem(TAB_COUNT_KEY)).toBe('1')
    expect(replaceMock).not.toHaveBeenCalled()
  })

  it('unlocks the app and restores the last path when returning to a single tab', async () => {
    currentRoute.value = { name: 'LockedView', fullPath: '/locked' }
    sessionStorage.setItem(RETURN_PATH_KEY, '/teams/2')

    tabGuardStore.init()
    await Promise.resolve()

    replaceMock.mockClear()
    sessionStorage.setItem(RETURN_PATH_KEY, '/teams/2')

    const storageHandler = storageListeners[0]
    expect(storageHandler).toBeDefined()

    localStorage.setItem(TAB_COUNT_KEY, '1')
    storageHandler!({ key: TAB_COUNT_KEY, newValue: '1' })

    expect(replaceMock).toHaveBeenCalledWith('/teams/2')
    expect(sessionStorage.getItem(RETURN_PATH_KEY)).toBeNull()
  })

  it('tracks the last non-locked route through the afterEach hook', () => {
    tabGuardStore.init()

    const hook = afterEachCallbacks[0]
    expect(hook).toBeDefined()

    hook!({ name: 'bank', fullPath: '/teams/1/bank' })
    expect(sessionStorage.getItem(RETURN_PATH_KEY)).toBe('/teams/1/bank')

    hook!({ name: 'LockedView', fullPath: '/locked' })
    expect(sessionStorage.getItem(RETURN_PATH_KEY)).toBe('/teams/1/bank')
  })
})
