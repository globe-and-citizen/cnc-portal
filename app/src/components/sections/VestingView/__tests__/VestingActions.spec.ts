import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import VestingActions from '@/components/sections/VestingView/VestingActions.vue'
import ButtonUI from '@/components/ButtonUI.vue'
import ModalComponent from '@/components/ModalComponent.vue'
import CreateVesting from '@/components/sections/VestingView/forms/CreateVesting.vue'
import { ref } from 'vue'
import { WagmiPlugin, createConfig, http } from '@wagmi/vue'
import { mainnet } from 'viem/chains'
import { createTestingPinia } from '@pinia/testing'
import { mockUseCurrencyStore } from '@/tests/mocks/index.mock'
import { mockUseContractBalance } from '@/tests/mocks/useContractBalance.mock'

const wagmiConfig = createConfig({
  chains: [mainnet],
  transports: {
    [mainnet.id]: http()
  }
})

const memberAddress = '0x000000000000000000000000000000000000dead'
const mockReloadKey = ref<number>(0)

const mockCurrentTeam = ref({
  id: 1 as number | null,
  ownerAddress: memberAddress,
  teamContracts: [
    {
      type: 'InvestorV1',
      address: '0x000000000000000000000000000000000000beef'
    }
  ]
})
const mockWriteContract = {
  writeContract: vi.fn(),
  error: ref<null | Error>(null),
  isPending: ref(false),
  data: ref(null)
}

const mockWaitForReceipt = {
  isLoading: ref(false),
  isSuccess: ref(false)
}

vi.mock('@wagmi/vue', async (importOriginal) => {
  const actual = (await importOriginal()) as typeof import('@wagmi/vue')
  return {
    ...actual,
    useWriteContract: vi.fn(() => mockWriteContract),
    useWaitForTransactionReceipt: vi.fn(() => mockWaitForReceipt),
    useReadContract: vi.fn(({}) => {
      return {
        data: ref(BigInt(0)),
        refetch: vi.fn(),
        error: ref(null)
      }
    })
  }
})

vi.mock('@/stores/useToastStore')
vi.mock('@/stores', () => ({
  useUserDataStore: () => ({
    address: '0x000000000000000000000000000000000000dead'
  }),
  useTeamStore: () => ({
    currentTeam: mockCurrentTeam.value,
    currentTeamId: mockCurrentTeam.value.id,
    getContractAddressByType: vi.fn((type) => {
      return type ? '0x000000000000000000000000000000000000beef' : undefined
    })
  })
}))

vi.mock('@/stores/currencyStore', async (importOriginal) => {
  const original: object = await importOriginal()
  return {
    ...original,
    useCurrencyStore: vi.fn(() => ({ ...mockUseCurrencyStore() }))
  }
})
vi.mock('@/composables/useContractBalance', () => ({
  useContractBalance: vi.fn(() => mockUseContractBalance)
}))

describe('VestingActions.vue', () => {
  let wrapper: VueWrapper
  const mountComponent = (props = {}) => {
    return mount(VestingActions, {
      props: {
        reloadKey: mockReloadKey.value,
        ...props
      },
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn }), [WagmiPlugin, { config: wagmiConfig }]]
      }
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockCurrentTeam.value = {
      id: 1 as number | null,
      ownerAddress: memberAddress,
      teamContracts: [
        {
          type: 'InvestorV1',
          address: '0x000000000000000000000000000000000000beef'
        }
      ]
    }
    wrapper = mountComponent()
  })

  describe('Rendering', () => {
    it('displays add vesting button when user is team owner', () => {
      const addButton = wrapper.findComponent(ButtonUI)
      expect(addButton.exists()).toBe(true)
      expect(addButton.text()).toContain('add vesting')
      expect(addButton.attributes('data-test')).toBe('createAddVesting')
    })

    it('hides add vesting button when user is not team owner', () => {
      mockCurrentTeam.value.ownerAddress = '0x456'
      wrapper = mount(VestingActions, {
        props: { reloadKey: 0 }
      })

      const addButton = wrapper.find('[data-test="createAddVesting"]')

      expect(addButton.exists()).toBe(false)
    })
  })

  describe('Modal Behavior', () => {
    it('opens modal on add vesting button click', async () => {
      mockCurrentTeam.value.ownerAddress = memberAddress
      wrapper = mount(VestingActions, {
        props: { reloadKey: 0 },
        global: {
          plugins: [
            createTestingPinia({ createSpy: vi.fn }),
            [WagmiPlugin, { config: wagmiConfig }]
          ]
        }
      })
      const addButton = wrapper.findComponent(ButtonUI)
      expect(addButton.exists()).toBe(true)
      await addButton.trigger('click')
      await wrapper.vm.$nextTick()

      const modal = wrapper.findComponent(ModalComponent)

      expect(modal.props().modelValue).toBe(true)
    })

    it('closes modal when handleClose is emitted from CreateVesting', async () => {
      // Ensure wrapper is remounted with correct state
      mockCurrentTeam.value.ownerAddress = memberAddress
      wrapper = mount(VestingActions, {
        props: { reloadKey: 0 },
        global: {
          plugins: [
            createTestingPinia({ createSpy: vi.fn }),
            [WagmiPlugin, { config: wagmiConfig }]
          ]
        }
      })

      // Open modal first
      const addButton = wrapper.findComponent(ButtonUI)
      await addButton.trigger('click')
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      const createVesting = wrapper.findComponent(CreateVesting)
      expect(createVesting.exists()).toBe(true)

      // Emit the close event
      await createVesting.vm.$emit('closeAddVestingModal')
      await wrapper.vm.$nextTick()

      // Check that the modal is no longer mounted in the DOM
      const modal = wrapper.findComponent(ModalComponent)
      expect(modal.exists()).toBe(false)
    })
  })

  describe('CreateVesting Component', () => {
    it('passes correct props to CreateVesting', async () => {
      // Ensure wrapper is remounted with correct state
      mockCurrentTeam.value.ownerAddress = memberAddress
      wrapper = mount(VestingActions, {
        props: { reloadKey: 0 },
        global: {
          plugins: [
            createTestingPinia({ createSpy: vi.fn }),
            [WagmiPlugin, { config: wagmiConfig }]
          ]
        }
      })

      const addButton = wrapper.findComponent(ButtonUI)
      await addButton.trigger('click')
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      const createVesting = wrapper.findComponent(CreateVesting)
      expect(createVesting.exists()).toBe(true)
      expect(createVesting.props()).toEqual({
        tokenAddress: '0x000000000000000000000000000000000000beef',
        reloadKey: 0
      })
    })

    it('does not render CreateVesting when team id is missing', () => {
      mockCurrentTeam.value.id = null
      wrapper = mount(VestingActions, {
        props: { reloadKey: 0 }
      })

      const createVesting = wrapper.findComponent(CreateVesting)
      expect(createVesting.exists()).toBe(false)
    })
  })

  describe('Event Handling', () => {
    it('emits reload event when CreateVesting emits reload', async () => {
      // Ensure wrapper is remounted with correct state
      mockCurrentTeam.value.ownerAddress = memberAddress
      wrapper = mount(VestingActions, {
        props: { reloadKey: 0 },
        global: {
          plugins: [
            createTestingPinia({ createSpy: vi.fn }),
            [WagmiPlugin, { config: wagmiConfig }]
          ]
        }
      })

      const addButton = wrapper.findComponent(ButtonUI)
      await addButton.trigger('click')
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      const createVesting = wrapper.findComponent(CreateVesting)
      expect(createVesting.exists()).toBe(true)

      await createVesting.vm.$emit('reload')

      expect(wrapper.emitted('reload')).toBeTruthy()
      expect(wrapper.emitted('reload')).toHaveLength(1)
    })
  })
})
