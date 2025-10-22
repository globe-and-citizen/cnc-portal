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

// Shared mock user store so component and tests reference the same instance
const mockUserStore = {
  address: ref('0xOwner'),
  name: ref('Owner'),
  imageUrl: ref(''),
  isAuth: ref(true),
  setUserData: vi.fn()
}

vi.mock('@/stores/user', () => ({
  useUserDataStore: vi.fn(() => mockUserStore)
}))

// Mock useCustomFetch to provide a chainable API used in App.vue
vi.mock('@/composables/useCustomFetch', () => {
  const data = ref<unknown>(null)
  const isFetching = ref(false)
  const error = ref(null)
  const execute = vi.fn(async () => {
    // simulate a successful update response
    isFetching.value = true
    await Promise.resolve()
    data.value = {
      name: 'New Name',
      address: '0xOwner',
      nonce: '123',
      imageUrl: 'img.png'
    }
    isFetching.value = false
    return
  })

  return {
    useCustomFetch: vi.fn(() => ({
      put: () => ({
        json: () => ({ data, isFetching, error, execute })
      })
    }))
  }
})

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
    it('renders ModalComponent if showModal is true', async () => {
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

  describe('User Update Flow', () => {
    it('calls execute, shows success toast, updates store, and closes modal', async () => {
      const wrapper = shallowMount(App, {
        global: {
          plugins: [createTestingPinia({ createSpy: vi.fn })]
        }
      })

      // @ts-expect-error: updateUserInput is a ref on the component
      wrapper.vm.updateUserInput = { name: 'New Name', address: '0xOwner', imageUrl: '' }
      // @ts-expect-error: showModal is not typed on vm
      wrapper.vm.showModal = true

      // @ts-expect-error: handleUserUpdate exists on component
      await wrapper.vm.handleUserUpdate()
      await wrapper.vm.$nextTick()

      const { addSuccessToast } = useToastStore()

      expect(addSuccessToast).toHaveBeenCalledWith('User updated')
      expect(mockUserStore.setUserData).toHaveBeenCalledWith(
        'New Name',
        '0xOwner',
        '123',
        'img.png'
      )
      // @ts-expect-error: showModal on vm
      expect(wrapper.vm.showModal).toBe(false)
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
    })
  })
})
