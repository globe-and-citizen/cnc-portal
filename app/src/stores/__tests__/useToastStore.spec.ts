import { afterEach, beforeEach } from 'node:test'
import { createPinia, setActivePinia } from 'pinia'
import { describe, expect, it, vi } from 'vitest'

import { ToastType } from '@/types/toast-type'
import { nextTick } from 'vue'
import { useToastStore } from '@/stores/useToastStore'

describe.only('Toast Store', () => {
  beforeEach(() => {
    // tell vitest we use mocked time
    vi.useFakeTimers()
  })

  afterEach(() => {
    // restoring date after each test run
    vi.useRealTimers()
  })

  it.only('Should add toast correctly', () => {
    setActivePinia(createPinia())
    const toastStore = useToastStore()

    const date = new Date(2000, 1, 1, 13, 0, 0)
    vi.setSystemTime(date)
    const toast = {
      message: 'This is an info toast!',
      type: ToastType.Info,
      timeout: 50000
    }

    toastStore.addToast(toast)

    expect(toastStore.toasts.length).toBe(1)
    expect(toastStore.toasts[0].message).toBe(toast.message)

    vi.setSystemTime(new Date(2000, 2, 1, 13, 10, 10))

    expect(toastStore.toasts).toMatchInlineSnapshot(`
      [
        {
          "id": 1,
          "message": "This is an info toast!",
          "timeout": 50000,
          "type": "info",
        },
      ]
    `)
  })

  it.skip('Should remove toast correctly', () => {
    const toastStore = useToastStore()
    const toast = { message: 'Hello World', timeout: 1000 }

    toastStore.addToast(toast)
    toastStore.removeToast(0)

    expect(toastStore.toasts.value.length).toBe(0)
  })
})
