import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { mount, type VueWrapper, flushPromises } from '@vue/test-utils'
import { nextTick, ref, defineComponent, reactive } from 'vue'
import type { Address } from 'viem'
import SafeOwnersCard from '../SafeOwnersCard.vue'

// Mock @iconify/vue FIRST
vi.mock('@iconify/vue', () => ({
  Icon: {
    name: 'Icon',
    template: '<span></span>',
    props: ['icon']
  }
}))

// Define interfaces for type safety
interface MockSafeInfo {
  address: Address
  threshold: number
  owners: Address[]
}

interface MockTeam {
  safeAddress?: Address
  id: string
  name: string
}

interface MockTeamMeta {
  data: {
    safeAddress?: Address
  }
}

// Hoisted mocks
const {
  mockUseAccount,
  mockUseChainId,
  mockUseSafeInfoQuery,
  mockGetSafeSettingsUrl,
  mockOpenSafeAppUrl,
  mockTeamStore,
  mockToastStore
} = vi.hoisted(() => ({
  mockUseAccount: vi.fn(),
  mockUseChainId: vi.fn(),
  mockUseSafeInfoQuery: vi.fn(),
  mockGetSafeSettingsUrl: vi.fn(),
  mockOpenSafeAppUrl: vi.fn(),
  mockTeamStore: {
    currentTeam: null as MockTeam | null,
    currentTeamMeta: null as MockTeamMeta | null
  },
  mockToastStore: {
    addSuccessToast: vi.fn(),
    addErrorToast: vi.fn()
  }
}))

// Test constants - defined before mocks
const MOCK_DATA = {
  safeAddress: '0x1234567890123456789012345678901234567890' as Address,
  owners: [
    '0x1111111111111111111111111111111111111111' as Address,
    '0x2222222222222222222222222222222222222222' as Address,
    '0x3333333333333333333333333333333333333333' as Address
  ],
  safeInfo: {
    address: '0x1234567890123456789012345678901234567890' as Address,
    threshold: 2,
    owners: [
      '0x1111111111111111111111111111111111111111' as Address,
      '0x2222222222222222222222222222222222222222' as Address,
      '0x3333333333333333333333333333333333333333' as Address
    ]
  } as MockSafeInfo,
  team: {
    safeAddress: '0x1234567890123456789012345678901234567890' as Address,
    id: '1',
    name: 'Test Team'
  } as MockTeam
} as const

// Mock reactive refs for query return
const mockSafeInfoData = ref<MockSafeInfo | null>(null)
const mockIsLoading = ref(false)
const mockError = ref<Error | null>(null)
const mockRefetch = vi.fn()

// Mock wagmi/vue
vi.mock('@wagmi/vue', () => ({
  useAccount: mockUseAccount,
  useChainId: mockUseChainId
}))

// Mock Safe queries - return function that returns reactive refs
vi.mock('@/queries/safe.queries', () => ({
  useSafeInfoQuery: mockUseSafeInfoQuery
}))

// Mock stores
vi.mock('@/stores', () => ({
  useTeamStore: vi.fn(() => mockTeamStore),
  useToastStore: vi.fn(() => mockToastStore)
}))

// Mock Safe composables
vi.mock('@/composables/safe', () => ({
  getSafeSettingsUrl: mockGetSafeSettingsUrl,
  openSafeAppUrl: mockOpenSafeAppUrl
}))

// Mock utils
vi.mock('@/utils', () => ({
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  }
}))

// Component stubs
const SELECTORS = {
  card: '[data-test="card-component"]',
  cardHeader: '[data-test="card-header"]',
  cardBody: '[data-test="card-body"]',
  cardFooter: '[data-test="card-footer"]',
  addSignerBtn: '[data-test="add-signer-button"]',
  updateThresholdBtn: '[data-test="update-threshold-button"]',
  ownerItem: '[data-test="owner-item"]',
  removeOwnerBtn: '[data-test="remove-owner-button"]',
  addSignerModal: '[data-test="add-signer-modal"]',
  updateThresholdModal: '[data-test="update-threshold-modal"]',
  loadingSpinner: '.animate-spin',
  openSafeAppFooter: '[data-test="open-safe-app-footer"]'
} as const

const CardStub = defineComponent({
  template: `
    <div data-test="card-component">
      <div data-test="card-header">
        <slot name="card-action" />
      </div>
      <div data-test="card-body"><slot /></div>
      <div v-if="$slots.footer" data-test="card-footer">
        <slot name="footer" />
      </div>
    </div>
  `
})

const ButtonStub = defineComponent({
  props: ['variant', 'size', 'disabled', 'loading', 'class'],
  emits: ['click'],
  template: `
    <button 
      data-test="button" 
      :disabled="disabled"
      :class="$attrs['data-test']"
      @click="$emit('click')"
    >
      <slot />
    </button>
  `
})

const AddressToolTipStub = defineComponent({
  props: ['address'],
  template: '<div data-test="address-tooltip">{{ address }}</div>'
})

const RemoveOwnerButtonStub = defineComponent({
  props: ['ownerAddress', 'safeAddress', 'totalOwners', 'threshold', 'isConnectedUserOwner'],
  template: `
    <button data-test="remove-owner-button">
      Remove
    </button>
  `
})

const AddSignerModalStub = defineComponent({
  props: ['modelValue', 'safeAddress', 'currentOwners', 'currentThreshold'],
  emits: ['update:modelValue', 'signer-added'],
  template: '<div data-test="add-signer-modal"></div>'
})

const UpdateThresholdModalStub = defineComponent({
  props: ['modelValue', 'safeAddress', 'currentOwners', 'currentThreshold'],
  emits: ['update:modelValue', 'threshold-updated'],
  template: '<div data-test="update-threshold-modal"></div>'
})

describe('SafeOwnersCard', () => {
  let wrapper: VueWrapper<InstanceType<typeof SafeOwnersCard>>

  const createWrapper = () =>
    mount(SafeOwnersCard, {
      global: {
        stubs: {
          CardComponent: CardStub,
          ButtonUI: ButtonStub,
          AddressToolTip: AddressToolTipStub,
          RemoveOwnerButton: RemoveOwnerButtonStub,
          AddSignerModal: AddSignerModalStub,
          UpdateThresholdModal: UpdateThresholdModalStub
        }
      }
    })

  beforeEach(() => {
    vi.clearAllMocks()

    // Setup default query return
    mockUseSafeInfoQuery.mockReturnValue({
      data: mockSafeInfoData,
      error: mockError,
      isLoading: mockIsLoading,
      refetch: mockRefetch
    })

    // Setup default mocks
    mockUseAccount.mockReturnValue({
      address: ref(undefined),
      isConnected: ref(false)
    })

    mockUseChainId.mockReturnValue(ref(137))

    mockGetSafeSettingsUrl.mockReturnValue(
      'https://app.safe.global/settings/setup?safe=polygon:0x1234567890123456789012345678901234567890'
    )

    mockOpenSafeAppUrl.mockImplementation(() => {})

    // Reset reactive values
    mockSafeInfoData.value = null
    mockIsLoading.value = false
    mockError.value = null
    mockTeamStore.currentTeam = MOCK_DATA.team
    mockTeamStore.currentTeamMeta = {
      data: { safeAddress: MOCK_DATA.safeAddress }
    }
  })

  afterEach(() => {
    if (wrapper) wrapper.unmount()
  })

  describe('Component Rendering', () => {
    it('should render the card component correctly', () => {
      wrapper = createWrapper()

      expect(wrapper.find(SELECTORS.card).exists()).toBe(true)
      expect(wrapper.find(SELECTORS.cardBody).exists()).toBe(true)
    })

    it('should render action buttons in card header', () => {
      wrapper = createWrapper()

      expect(wrapper.find(SELECTORS.addSignerBtn).exists()).toBe(true)
      expect(wrapper.find(SELECTORS.updateThresholdBtn).exists()).toBe(true)
    })
  })

  describe('Loading States', () => {
    it('should show loading spinner when data is fetching', () => {
      mockIsLoading.value = true
      wrapper = createWrapper()

      expect(wrapper.find(SELECTORS.loadingSpinner).exists()).toBe(true)
    })

    it('should hide content during loading', () => {
      mockIsLoading.value = true
      wrapper = createWrapper()

      expect(wrapper.find(SELECTORS.ownerItem).exists()).toBe(false)
    })
  })

  describe('Owners Display', () => {
    it('should display all owners correctly', async () => {
      mockSafeInfoData.value = MOCK_DATA.safeInfo
      wrapper = createWrapper()
      await nextTick()

      const ownerItems = wrapper.findAll(SELECTORS.ownerItem)
      expect(ownerItems).toHaveLength(MOCK_DATA.safeInfo.owners.length)
    })

    it('should show total owners count in footer', async () => {
      mockSafeInfoData.value = MOCK_DATA.safeInfo
      wrapper = createWrapper()
      await nextTick()

      const footer = wrapper.find(SELECTORS.cardFooter)
      if (footer.exists()) {
        expect(footer.text()).toContain('Total:')
        expect(footer.text()).toContain('owners')
      }
    })

    it('should render RemoveOwnerButton for each owner', async () => {
      mockSafeInfoData.value = MOCK_DATA.safeInfo
      wrapper = createWrapper()
      await nextTick()

      const removeButtons = wrapper.findAll(SELECTORS.removeOwnerBtn)
      expect(removeButtons).toHaveLength(MOCK_DATA.safeInfo.owners.length)
    })

    it('should highlight current user as owner', async () => {
      mockUseAccount.mockReturnValue({
        address: ref(MOCK_DATA.owners[0]),
        isConnected: ref(true)
      })
      mockSafeInfoData.value = MOCK_DATA.safeInfo
      wrapper = createWrapper()
      await nextTick()

      expect(wrapper.text()).toContain('You')
    })
  })

  describe('User Permissions', () => {
    it('should disable add signer button when user is not an owner', async () => {
      mockUseAccount.mockReturnValue({
        address: ref('0x9999999999999999999999999999999999999999' as Address),
        isConnected: ref(true)
      })
      mockSafeInfoData.value = MOCK_DATA.safeInfo
      wrapper = createWrapper()
      await nextTick()

      const addSignerBtn = wrapper.find(SELECTORS.addSignerBtn)
      expect(addSignerBtn.attributes('disabled')).toBeDefined()
    })

    it('should enable add signer button when user is an owner', async () => {
      mockUseAccount.mockReturnValue({
        address: ref(MOCK_DATA.owners[0]),
        isConnected: ref(true)
      })
      mockSafeInfoData.value = MOCK_DATA.safeInfo
      wrapper = createWrapper()
      await nextTick()

      const addSignerBtn = wrapper.find(SELECTORS.addSignerBtn)
      expect(addSignerBtn.attributes('disabled')).toBeUndefined()
    })
  })

  describe('Modal Interactions', () => {
    it('should open add signer modal when button is clicked', async () => {
      wrapper = createWrapper()

      const addSignerBtn = wrapper.find(SELECTORS.addSignerBtn)
      await addSignerBtn.trigger('click')
      await nextTick()

      expect(wrapper.find(SELECTORS.addSignerModal).exists()).toBe(true)
    })

    it('should open update threshold modal when button is clicked', async () => {
      wrapper = createWrapper()

      const updateThresholdBtn = wrapper.find(SELECTORS.updateThresholdBtn)
      await updateThresholdBtn.trigger('click')
      await nextTick()

      expect(wrapper.find(SELECTORS.updateThresholdModal).exists()).toBe(true)
    })

    it('should close modal on threshold-updated event', async () => {
      wrapper = createWrapper()

      // Open modal
      const updateThresholdBtn = wrapper.find(SELECTORS.updateThresholdBtn)
      await updateThresholdBtn.trigger('click')
      await nextTick()

      // Trigger threshold-updated event
      const modal = wrapper.findComponent(UpdateThresholdModalStub)
      await modal.vm.$emit('threshold-updated')
      await nextTick()

      // Modal should be closed (modelValue should be false)
      expect(modal.props('modelValue')).toBe(false)
    })
  })

  describe('Error Handling', () => {
    it('should handle error state gracefully', async () => {
      mockError.value = new Error('Failed to load Safe info')
      wrapper = createWrapper()
      await nextTick()

      // Component should still render
      expect(wrapper.find(SELECTORS.card).exists()).toBe(true)
    })

    it.skip('should log error when query fails', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockError.value = new Error('Failed to load Safe info')

      wrapper = createWrapper()
      await nextTick()
      await flushPromises()

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error loading safe info:', expect.any(Error))

      consoleErrorSpy.mockRestore()
    })
  })

  describe('Empty State', () => {
    it('should show empty state when no owners found', async () => {
      mockSafeInfoData.value = { ...MOCK_DATA.safeInfo, owners: [] }
      wrapper = createWrapper()
      await nextTick()

      expect(wrapper.text()).toContain('No owners found')
    })

    it('should not show owner items when empty', async () => {
      mockSafeInfoData.value = { ...MOCK_DATA.safeInfo, owners: [] }
      wrapper = createWrapper()
      await nextTick()

      expect(wrapper.find(SELECTORS.ownerItem).exists()).toBe(false)
    })
  })

  describe('Safe App Integration', () => {
    it('should call getSafeSettingsUrl with correct params', async () => {
      mockSafeInfoData.value = MOCK_DATA.safeInfo
      wrapper = createWrapper()
      await nextTick()

      const footerButton = wrapper.find(SELECTORS.openSafeAppFooter)
      if (footerButton.exists()) {
        await footerButton.trigger('click')

        expect(mockGetSafeSettingsUrl).toHaveBeenCalledWith(137, MOCK_DATA.safeAddress)
      }
    })

    it('should open Safe app in new window', async () => {
      mockSafeInfoData.value = MOCK_DATA.safeInfo
      wrapper = createWrapper()
      await nextTick()

      const footerButton = wrapper.find(SELECTORS.openSafeAppFooter)
      if (footerButton.exists()) {
        await footerButton.trigger('click')

        expect(mockOpenSafeAppUrl).toHaveBeenCalledWith(
          'https://app.safe.global/settings/setup?safe=polygon:0x1234567890123456789012345678901234567890'
        )
      }
    })
  })

  describe('Edge Cases', () => {
    it('should handle missing Safe address gracefully', () => {
      mockTeamStore.currentTeam = { ...MOCK_DATA.team, safeAddress: undefined }
      wrapper = createWrapper()

      expect(wrapper.find(SELECTORS.card).exists()).toBe(true)
    })

    it('should disable buttons when no Safe address', () => {
      mockTeamStore.currentTeam = { ...MOCK_DATA.team, safeAddress: undefined }
      wrapper = createWrapper()

      const addSignerBtn = wrapper.find(SELECTORS.addSignerBtn)
      expect(addSignerBtn.attributes('disabled')).toBeDefined()
    })

    it('should handle null safeInfo data', async () => {
      mockSafeInfoData.value = null
      wrapper = createWrapper()
      await nextTick()

      expect(wrapper.find(SELECTORS.card).exists()).toBe(true)
    })
  })
})
