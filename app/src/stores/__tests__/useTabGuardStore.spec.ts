import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useTabGuardStore } from '@/stores/useTabGuardStore'

const TAB_COUNT_KEY = 'app_open_tabs'

type StorageEventLike = { key: string | null; newValue: string | null }
type StorageListener = (event: StorageEventLike) => void
type BeforeUnloadListener = (event: Event) => void

const originalAddEventListener = window.addEventListener

describe('useTabGuardStore', () => {
  let tabGuardStore: ReturnType<typeof useTabGuardStore>
  let storageListeners: StorageListener[]
  let beforeUnloadListeners: BeforeUnloadListener[]

  beforeEach(() => {
    setActivePinia(createPinia())
    tabGuardStore = useTabGuardStore()

    localStorage.clear()
    sessionStorage.clear()

    storageListeners = []
    beforeUnloadListeners = []

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

  it('updates openTabs when storage events change the tab count', () => {
    tabGuardStore.init()

    const storageHandler = storageListeners[0]
    expect(storageHandler).toBeDefined()

    // simulate another tab incrementing the count
    localStorage.setItem(TAB_COUNT_KEY, '2')
    storageHandler!({ key: TAB_COUNT_KEY, newValue: '2' })

    expect(localStorage.getItem(TAB_COUNT_KEY)).toBe('2')
    expect(tabGuardStore.openTabs).toBe(2)
  })

  it('normalizes cleared storage values back to a single tab', () => {
    tabGuardStore.init()

    const storageHandler = storageListeners[0]
    expect(storageHandler).toBeDefined()

    localStorage.setItem(TAB_COUNT_KEY, '5')
    storageHandler!({ key: TAB_COUNT_KEY, newValue: null })

    expect(localStorage.getItem(TAB_COUNT_KEY)).toBe('1')
    expect(tabGuardStore.openTabs).toBe(1)
  })
})
