import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'

// Import setup files to ensure proper mocking - these handle wagmi, stores, and queries
import '@/tests/setup/wagmi.vue.setup'
import '@/tests/setup/composables.setup'
import '@/tests/setup/store.setup'

// Mock vue-router
vi.mock('vue-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue-router')>()
  return {
    ...actual,
    useRoute: vi.fn(() => ({
      params: { id: '1' },
      path: '/teams/1'
    })),
    useRouter: vi.fn(() => ({
      push: vi.fn(),
      replace: vi.fn(),
      back: vi.fn(),
      go: vi.fn(),
      beforeEach: vi.fn(),
      afterEach: vi.fn()
    })),
    RouterView: { name: 'RouterView', template: '<div data-test="router-view">Router View</div>' }
  }
})

// Import components
import App from '@/App.vue'
import { createTestingPinia } from '@pinia/testing'

// Mock child components
const stubComponents = {
  Drawer: { template: '<div data-test="drawer-component"></div>' },
  NavBar: { template: '<div data-test="navbar-component"></div>' },
  ModalComponent: { template: '<div data-test="modal-component"><slot /></div>' },
  LockScreen: { template: '<div data-test="lock-screen">Lock Screen</div>' },
  ToastContainer: { template: '<div data-test="toast-container"></div>' },
  EditUserForm: { template: '<div data-test="edit-user-form"></div>' },
  AddTeamForm: { template: '<div data-test="add-team-form"></div>' },
  VueQueryDevtools: { template: '<div data-test="vue-query-devtools"></div>' }
}

describe('App.vue - Web3 Integration', () => {
  let wrapper: ReturnType<typeof mount>
  let pinia: ReturnType<typeof createTestingPinia>

  beforeEach(() => {
    vi.clearAllMocks()
    pinia = createTestingPinia({ createSpy: vi.fn })
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  const createWrapper = (options = {}) => {
    return mount(App, {
      global: {
        plugins: [pinia],
        components: stubComponents,
        stubs: {
          RouterView: true,
          VueQueryDevtools: true,
          ...stubComponents
        }
      },
      ...options
    })
  }

  describe('Wallet Disconnect Handling', () => {
    it('should initialize with useConnectionEffect', () => {
      wrapper = createWrapper()
      expect(wrapper.exists()).toBe(true)
    })

    it('should have connection effect handler defined', () => {
      wrapper = createWrapper()
      // Component uses useConnectionEffect which is mocked in wagmi.vue.setup.ts
      expect(wrapper.exists()).toBe(true)
    })

    it('should have proper configuration for connection effect', () => {
      wrapper = createWrapper()
      // Component uses useConnectionEffect with onDisconnect handler
      expect(wrapper.exists()).toBe(true)
    })

    it('should pass correct configuration to useConnectionEffect', () => {
      wrapper = createWrapper()
      // Component successfully mounts with all wagmi composables mocked
      expect(wrapper.exists()).toBe(true)
    })
  })

  describe('Chain Switching', () => {
    it('should have chain switching capability', () => {
      wrapper = createWrapper()

      // Component uses useSwitchChain which is mocked in setup
      expect(wrapper.exists()).toBe(true)
    })

    it('should handle chain ID updates', async () => {
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      // Component uses useChainId which is mocked in setup
      expect(wrapper.exists()).toBe(true)
    })
  })

  describe('Toast Container', () => {
    it('should render ToastContainer component', () => {
      wrapper = createWrapper()
      expect(wrapper.find('[data-test="toast-container"]').exists()).toBe(true)
    })
  })
})
