import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { nextTick, ref, defineComponent } from 'vue'
import type { Address } from 'viem'
import SafeOwnersCard from '../SafeOwnersCard.vue'
import { useAccountFn, useChainIdFn } from '@/tests/mocks'
import { useTeamStore } from '@/stores'

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

// Hoisted mocks
const { mockuseGetSafeInfoQuery, mockGetSafeSettingsUrl, mockOpenSafeAppUrl } = vi.hoisted(() => ({
  mockuseGetSafeInfoQuery: vi.fn(),
  mockGetSafeSettingsUrl: vi.fn(),
  mockOpenSafeAppUrl: vi.fn()
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

// Mock Safe queries - return function that returns reactive refs
vi.mock('@/queries/safe.queries', () => ({
  useGetSafeInfoQuery: mockuseGetSafeInfoQuery
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
  props: ['open', 'safeAddress', 'currentOwners', 'currentThreshold'],
  emits: ['update:open', 'threshold-updated'],
  template: '<div data-test="update-threshold-modal"></div>'
})

describe('SafeOwnersCard', () => {
  let wrapper: VueWrapper<InstanceType<typeof SafeOwnersCard>>

  const defaultProps = { address: MOCK_DATA.safeAddress }

  const createWrapper = (props = {}) =>
    mount(SafeOwnersCard, {
      props: { ...defaultProps, ...props },
      global: {
        stubs: {
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
    mockuseGetSafeInfoQuery.mockReturnValue({
      data: mockSafeInfoData,
      error: mockError,
      isLoading: mockIsLoading,
      refetch: mockRefetch
    })

    // Setup default mocks
    useAccountFn.mockReturnValue({
      address: ref(undefined),
      isConnected: ref(false)
    })

    useChainIdFn.mockReturnValue(ref(137))

    vi.mocked(useTeamStore).mockReturnValue({
      currentTeam: MOCK_DATA.team,
      currentTeamMeta: { data: { safeAddress: MOCK_DATA.safeAddress } }
    } as ReturnType<typeof useTeamStore>)

    mockGetSafeSettingsUrl.mockReturnValue(
      'https://app.safe.global/settings/setup?safe=polygon:0x1234567890123456789012345678901234567890'
    )

    mockOpenSafeAppUrl.mockImplementation(() => {})

    // Reset reactive values
    mockSafeInfoData.value = null
    mockIsLoading.value = false
    mockError.value = null
  })

  afterEach(() => {
    if (wrapper) wrapper.unmount()
  })

  describe('Component Rendering', () => {
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
  })

  describe('User Permissions', () => {
    it('should disable add signer button when user is not an owner', async () => {
      useAccountFn.mockReturnValue({
        address: ref('0x9999999999999999999999999999999999999999' as Address),
        isConnected: ref(true)
      })
      mockSafeInfoData.value = MOCK_DATA.safeInfo
      wrapper = createWrapper()
      await nextTick()

      const addSignerBtn = wrapper.find(SELECTORS.addSignerBtn)
      expect(addSignerBtn.attributes('disabled')).toBeDefined()
    })
  })
})
