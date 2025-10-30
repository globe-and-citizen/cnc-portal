// tests/App.spec.ts
import { describe, it, expect, vi } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import { ref } from 'vue'
import App from '@/App.vue'
import { createTestingPinia } from '@pinia/testing'
import { useToastStore } from '@/stores/__mocks__/useToastStore'

import ModalComponent from '@/components/ModalComponent.vue'

// Mock the composables
vi.mock('@/stores/useToastStore')
vi.mock('@/stores/user', () => ({
  useUserDataStore: vi.fn(() => {
    return {
      address: ref('0xOwner'),
      name: ref('Owner'),
      isAuth: ref(true)
    }
  })
}))

const mockUseReadContract = {
  data: ref<string | null>(null),
  isLoading: ref(false),
  error: ref<unknown>(null),
  refetch: vi.fn()
}

const mockUseWriteContract = {
  writeContract: vi.fn(),
  error: ref<unknown>(null),
  isPending: ref(false),
  data: ref(null)
}

const mockUseWaitForTransactionReceipt = {
  isPending: ref(false),
  isSuccess: ref(false)
}

const mockUseAccount = {
  isDisconnected: ref(false),
  chainId: ref(11155111)
}

vi.mock('@wagmi/vue', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    useReadContract: vi.fn(() => mockUseReadContract),
    useWriteContract: vi.fn(() => mockUseWriteContract),
    useWaitForTransactionReceipt: vi.fn(() => mockUseWaitForTransactionReceipt),
    useAccount: vi.fn(() => mockUseAccount),
    useSwitchChain: vi.fn(() => {
      return {
        switchChain: vi.fn()
      }
    })
  }
})

const mockUseAuth = {
  logout: vi.fn()
}

vi.mock('@/composables/useAuth', () => ({
  useAuth: vi.fn(() => mockUseAuth)
}))

describe('App.vue', () => {
  describe('Render', () => {
    it.skip('renders ModalComponent if showModal is true', async () => {
      const wrapper = shallowMount(App, {
        global: {
          plugins: [createTestingPinia({ createSpy: vi.fn })]
        }
      })

      // @ts-expect-error: showModal is not typed in the component's instance
      wrapper.vm.showModal = true
      await wrapper.vm.$nextTick()

      expect(wrapper.findComponent(ModalComponent).exists()).toBeTruthy()
    })
  })

  describe('Emits', () => {
    it('should call addErrorToast and logout on disconnect', async () => {
      const wrapper = shallowMount(App, {
        global: {
          plugins: [createTestingPinia({ createSpy: vi.fn })]
        }
      })

      const { addErrorToast } = useToastStore()
      mockUseAccount.isDisconnected.value = true
      await wrapper.vm.$nextTick()

      expect(addErrorToast).toHaveBeenCalledWith('Disconnected from wallet')
      // expect(mockUseAuth.logout).toHaveBeenCalled()
    })
  })
})
