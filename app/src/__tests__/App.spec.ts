// tests/App.spec.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { ref } from 'vue'
import App from '@/App.vue'
import { useToastStore } from '@/stores/useToastStore'
import { useTipsBalance, useWithdrawTips } from '@/composables/tips'

// Mock the composables
vi.mock('@/composables/tips', () => {
  return {
    useTipsBalance: vi.fn(),
    useWithdrawTips: vi.fn()
  }
})

vi.mock('@/stores/useToastStore', () => {
  return {
    useToastStore: vi.fn()
  }
})

describe('App.vue', () => {
  describe('Toast', () => {
    let addToast: ReturnType<typeof vi.fn>
    let balanceError: any
    let withdrawError: any
    let withdrawSuccess: any

    beforeEach(() => {
      setActivePinia(createPinia())

      // Mock the useToastStore
      addToast = vi.fn()
      const useToastStoreMock = useToastStore as unknown as ReturnType<typeof vi.fn>
      useToastStoreMock.mockReturnValue({ addToast })

      // Define reactive variables
      balanceError = ref(null)
      withdrawError = ref(null)
      withdrawSuccess = ref(null)

      // Mock the return values of the composables
      const useTipsBalanceMock = useTipsBalance as ReturnType<typeof vi.fn>
      const useWithdrawTipsMock = useWithdrawTips as ReturnType<typeof vi.fn>

      useTipsBalanceMock.mockReturnValue({
        data: ref(null),
        isLoading: ref(false),
        error: balanceError,
        execute: vi.fn()
      })

      useWithdrawTipsMock.mockReturnValue({
        isSuccess: withdrawSuccess,
        isLoading: ref(false),
        error: withdrawError,
        execute: vi.fn()
      })
    })

    it('should add toast on balanceError', async () => {
      shallowMount(App)

      balanceError.value = { reason: 'New balance error' }
      await new Promise((resolve) => setTimeout(resolve, 0)) // wait for the next tick

      expect(addToast).toHaveBeenCalledWith({
        message: 'New balance error',
        type: 'error',
        timeout: 5000
      })
    })

    it('should add toast on withdrawError', async () => {
      shallowMount(App)

      withdrawError.value = { reason: 'New withdraw error' }
      await new Promise((resolve) => setTimeout(resolve, 0)) // wait for the next tick

      expect(addToast).toHaveBeenCalledWith({
        message: 'New withdraw error',
        type: 'error',
        timeout: 5000
      })
    })

    it('should add toast on withdrawSuccess', async () => {
      shallowMount(App)

      withdrawSuccess.value = true
      withdrawError.value = { reason: 'Withdraw success message' }
      await new Promise((resolve) => setTimeout(resolve, 0)) // wait for the next tick

      expect(addToast).toHaveBeenCalledWith({
        message: 'Withdraw success message',
        type: 'success',
        timeout: 5000
      })
    })
  })
})
