import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useToastStore } from '@/stores/useToastStore'
import { nextTick } from 'vue'

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
    toastStore.addInfoToast('Test Toast')
    expect(toastStore.toasts.length).toBe(1)
    expect(toastStore.toasts[0]).toMatchObject({ message: 'Test Toast', timeout: 5000, id: 1 })
  })

  it('removes a toast after the specified timeout', async () => {
    vi.useFakeTimers()
    toastStore.addInfoToast('Test Toast')
    expect(toastStore.toasts.length).toBe(1)

    vi.advanceTimersByTime(5000)
    await nextTick()

    expect(toastStore.toasts.length).toBe(0)
  })

  it('resets id counter when all toasts are removed', async () => {
    vi.useFakeTimers()
    toastStore.addInfoToast('Toast 1')
    toastStore.addInfoToast('Toast 2')
    expect(toastStore.toasts.length).toBe(2)

    vi.advanceTimersByTime(5000)
    await nextTick()

    expect(toastStore.toasts.length).toBe(0)

    toastStore.addInfoToast('Toast 3')
    expect(toastStore.toasts[0]).toMatchObject({ message: 'Toast 3', id: 1 })
  })
})
