import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useToastStore } from '@/stores/useToastStore'
import { nextTick } from 'vue'
import { ToastType } from '@/types'

type ToastStore = ReturnType<typeof useToastStore>

describe('useToastStore', () => {
  let toastStore: ToastStore

  beforeEach(() => {
    setActivePinia(createPinia())
    toastStore = useToastStore()
  })

  it('initializes with an empty toasts array', () => {
    expect(toastStore.toasts).toEqual([])
  })

  it('adds a toast to the toasts array', async () => {
    toastStore.addToast({ message: 'Test Toast', type: ToastType.Info, timeout: 1000 })
    expect(toastStore.toasts.length).toBe(1)
    expect(toastStore.toasts[0]).toMatchObject({ message: 'Test Toast', timeout: 1000, id: 1 })
  })

  it('removes a toast after the specified timeout', async () => {
    vi.useFakeTimers()
    toastStore.addToast({ message: 'Test Toast', type: ToastType.Info, timeout: 1000 })
    expect(toastStore.toasts.length).toBe(1)

    vi.advanceTimersByTime(1000)
    await nextTick()

    expect(toastStore.toasts.length).toBe(0)
  })

  it('resets id counter when all toasts are removed', async () => {
    vi.useFakeTimers()
    toastStore.addToast({ message: 'Toast 1', type: ToastType.Info, timeout: 1000 })
    toastStore.addToast({ message: 'Toast 2', type: ToastType.Info, timeout: 1000 })
    expect(toastStore.toasts.length).toBe(2)

    vi.advanceTimersByTime(1000)
    await nextTick()

    expect(toastStore.toasts.length).toBe(0)

    toastStore.addToast({ message: 'Toast 3', type: ToastType.Info, timeout: 1000 })
    expect(toastStore.toasts[0]).toMatchObject({ message: 'Toast 3', id: 1 })
  })
})
