// tests/App.spec.ts
import { describe, it, expect, vi, afterEach } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import { ref } from 'vue'
import App from '@/App.vue'
import { createTestingPinia } from '@pinia/testing'
import { useToastStore } from '@/stores/__mocks__/useToastStore'

import ModalComponent from '@/components/ModalComponent.vue'

vi.mock('vue-router', () => ({
  useRoute: vi.fn(() => ({
    params: {
      id: 0
    }
  })),
  createRouter: vi.fn(() => ({
    beforeEach: vi.fn(),
    afterEach: vi.fn(),
    push: vi.fn(),
    replace: vi.fn(),
    go: vi.fn(),
    back: vi.fn(),
    forward: vi.fn()
  })),
  createWebHistory: vi.fn(),
  useRouter: vi.fn(() => ({
    beforeEach: vi.fn(),
    afterEach: vi.fn(),
    push: vi.fn(),
    replace: vi.fn(),
    go: vi.fn(),
    back: vi.fn(),
    forward: vi.fn()
  })),
  RouterView: vi.fn(() => null)
}))
// Mock the composables
vi.mock('@/stores/useToastStore')

// Mock useBackendWake to prevent TanStack Query initialization in tests
vi.mock('@/composables/useBackendWake', () => ({
  useBackendWake: vi.fn()
}))

// Mock useAuthToken
vi.mock('@/composables/useAuthToken', () => ({
  useAuthToken: vi.fn(() => ref('mock-token'))
}))

// Mock useTeamStore
const mockTeamStore = {
  currentTeam: { id: '1', name: 'Test Team' },
  currentTeamId: '1',
  teams: [],
  setCurrentTeamId: vi.fn(),
  getContractAddressByType: vi.fn()
}

vi.mock('@/stores/teamStore', () => ({
  useTeamStore: vi.fn(() => mockTeamStore)
}))

// Mock TanStack Vue Query with spies we can assert
const invalidateQueriesSpy = vi.fn()
const mutateSpy = vi.fn()
// Strongly-typed shape for App.vue weekly claim sync response
type WeeklyClaimSyncUpdate = {
  id: number
  previousStatus: string
  newStatus: string
}

type WeeklyClaimSyncResponse = {
  teamId?: number | string
  totalProcessed?: number
  updated?: WeeklyClaimSyncUpdate[]
  skipped?: { id: number; reason: string }[]
}

let latestMutationOptions: {
  onSuccess?: (data: WeeklyClaimSyncResponse) => void
  onError?: (err?: Error) => void
  mutationFn?: () => Promise<WeeklyClaimSyncResponse>
} | null = null

vi.mock('@tanstack/vue-query', () => ({
  useQueryClient: vi.fn(() => ({
    invalidateQueries: invalidateQueriesSpy
  })),
  useMutation: vi.fn(
    (options?: {
      onSuccess?: (data: WeeklyClaimSyncResponse) => void
      onError?: (err?: Error) => void
      mutationFn?: () => Promise<WeeklyClaimSyncResponse>
    }) => {
      latestMutationOptions = options || null
      return {
        mutate: mutateSpy,
        isPending: ref(false),
        isSuccess: ref(false),
        isError: ref(false),
        error: ref(null)
      }
    }
  )
}))

// Shared mock user store so component and tests reference the same instance
// Use plain values to mimic a Pinia store's properties (storeToRefs will create refs)
const mockUserStore = {
  address: '0xOwner',
  name: 'Owner',
  imageUrl: '',
  isAuth: true,
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
  chainId: ref(11155111),
  address: ref('0xOwner')
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
  afterEach(() => {
    // restore defaults between tests
    mockUserStore.isAuth = true
    mockUseAccount.address.value = '0xOwner'
    vi.clearAllMocks()
  })
  describe('Render', () => {
    it('renders ModalComponent if showModal is true', async () => {
      const wrapper = shallowMount(App, {
        global: {
          plugins: [createTestingPinia({ createSpy: vi.fn })]
        }
      })

      // @ts-expect-error: toggleSide is a ref on the component
      wrapper.vm.toggleSide = false
      await wrapper.vm.$nextTick()

      const overlay = wrapper.find('[data-test="drawer"]')
      await overlay.trigger('click')
      await wrapper.vm.$nextTick()

      // @ts-expect-error: toggleSide is a ref on the component
      expect(wrapper.vm.toggleSide).toBe(true)
    })

    it('should update toggleSide when Drawer emits update:modelValue', async () => {
      mockUserStore.isAuth = true
      const wrapper = shallowMount(App, {
        global: {
          plugins: [createTestingPinia({ createSpy: vi.fn })]
        }
      })

      // @ts-expect-error: toggleSide is a ref on the component
      wrapper.vm.toggleSide = false
      await wrapper.vm.$nextTick()

      const drawerComponent = wrapper.findComponent({ name: 'Drawer' })
      await drawerComponent.vm.$emit('update:modelValue', true)
      await wrapper.vm.$nextTick()

      // @ts-expect-error: toggleSide is a ref on the component
      expect(wrapper.vm.toggleSide).toBe(true)
    })

    it('should set editUserModal when Drawer emits openEditUserModal', async () => {
      mockUserStore.isAuth = true
      const wrapper = shallowMount(App, {
        global: {
          plugins: [createTestingPinia({ createSpy: vi.fn })]
        }
      })

      // @ts-expect-error: editUserModal is a ref on the component
      expect(wrapper.vm.editUserModal).toEqual({ mount: false, show: false })

      const drawerComponent = wrapper.findComponent({ name: 'Drawer' })
      await drawerComponent.vm.$emit('openEditUserModal')
      await wrapper.vm.$nextTick()

      // @ts-expect-error: editUserModal is a ref on the component
      expect(wrapper.vm.editUserModal).toEqual({ mount: true, show: true })
    })

    it('renders LockScreen when connected address does not match user address', async () => {
      // make addresses mismatch
      mockUserStore.isAuth = true
      mockUseAccount.address.value = '0xotheraddress'

      const wrapper = shallowMount(App, {
        global: {
          plugins: [createTestingPinia({ createSpy: vi.fn })]
        }
      })

      // LockScreen should be present when lock computed is true
      const lockScreen = wrapper.findComponent({ name: 'LockScreen' })
      expect(lockScreen.exists()).toBe(true)
    })

    it('does not render Drawer when user is not authenticated', async () => {
      mockUserStore.isAuth = false

      const wrapper = shallowMount(App, {
        global: {
          plugins: [createTestingPinia({ createSpy: vi.fn })]
        }
      })

      const drawer = wrapper.findComponent({ name: 'Drawer' })
      expect(drawer.exists()).toBe(false)
    })

    it('invalidates queries only when updated length > 0', async () => {
      // Mount the component
      mockUserStore.isAuth = true
      shallowMount(App, {
        global: {
          plugins: [createTestingPinia({ createSpy: vi.fn })]
        }
      })

      // Guard: ensure mutation options captured
      expect(latestMutationOptions).toBeTruthy()

      // Case 1: updated empty -> no invalidation
      invalidateQueriesSpy.mockClear()
      latestMutationOptions!.onSuccess?.({ updated: [] })
      expect(invalidateQueriesSpy).not.toHaveBeenCalled()

      // Case 2: updated has items -> invalidation occurs
      invalidateQueriesSpy.mockClear()
      latestMutationOptions!.onSuccess?.({
        updated: [{ id: 1, previousStatus: 'signed', newStatus: 'withdrawn' }]
      })
      expect(invalidateQueriesSpy).toHaveBeenCalled()
    })

    it('shows error toast when sync mutation fails', async () => {
      const wrapper = shallowMount(App, {
        global: {
          plugins: [createTestingPinia({ createSpy: vi.fn })]
        }
      })

      const { addErrorToast } = useToastStore()
      latestMutationOptions!.onError?.(new Error('fail'))
      await wrapper.vm.$nextTick()
      expect(addErrorToast).toHaveBeenCalledWith('Failed to sync weekly claims')
    })
  })

  describe('User Update Flow', () => {
    it('should display modal when editUserModal is mounted and shown', async () => {
      const wrapper = shallowMount(App, {
        global: {
          plugins: [createTestingPinia({ createSpy: vi.fn })]
        }
      })

      // @ts-expect-error: editUserModal is a ref on the component
      wrapper.vm.editUserModal = { mount: true, show: true }
      await wrapper.vm.$nextTick()

      expect(wrapper.findComponent(ModalComponent).exists()).toBeTruthy()
    })

    it('should reset editUserModal when modal emits reset', async () => {
      const wrapper = shallowMount(App, {
        global: {
          plugins: [createTestingPinia({ createSpy: vi.fn })]
        }
      })

      // @ts-expect-error: editUserModal is a ref on the component
      wrapper.vm.editUserModal = { mount: true, show: true }
      await wrapper.vm.$nextTick()

      const modal = wrapper.findComponent(ModalComponent)
      await modal.vm.$emit('reset')
      await wrapper.vm.$nextTick()

      // @ts-expect-error: editUserModal is a ref on the component
      expect(wrapper.vm.editUserModal).toEqual({ mount: false, show: false })
    })
  })

  describe('Emits', () => {
    it('should call addErrorToast and logout on disconnect', async () => {
      vi.useFakeTimers()
      const wrapper = shallowMount(App, {
        global: {
          plugins: [createTestingPinia({ createSpy: vi.fn })]
        }
      })

      const { addErrorToast } = useToastStore()
      mockUseAccount.isDisconnected.value = true
      await wrapper.vm.$nextTick()

      // toast should be called immediately
      expect(addErrorToast).toHaveBeenCalledWith('Disconnected from wallet')

      // logout should be called after the timeout in App.vue
      vi.runAllTimers()
      expect(mockUseAuth.logout).toHaveBeenCalled()
      vi.useRealTimers()
    })
  })
})
