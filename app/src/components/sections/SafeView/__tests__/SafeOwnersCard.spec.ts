import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { nextTick, ref, defineComponent, reactive } from 'vue'
import type { Address } from 'viem'
import SafeOwnersCard from '../SafeOwnersCard.vue'

// Mock @iconify/vue FIRST, before any other imports
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

// Mock variables - keep plain objects/refs to avoid hoist/init issues
const mockUseSafe = {
  useSafeOwners: vi.fn(),
  useSafeInfo: vi.fn(),
  useSafeAppUrls: vi.fn() // This should be a function that returns the URLs object
}

const mockSafeAppUrlsReturn = {
  getSafeSettingsUrl: vi.fn(),
  openSafeAppUrl: vi.fn()
}

const mockTeamStore = reactive({
  currentTeam: null as MockTeam | null
})
const mockUseChainId = ref(137) // Polygon

// Mock data with proper typing
const mockOwners = ref<Address[]>([])
const mockIsLoading = ref(false)
const mockError = ref<string | null>(null)
const mockFetchOwners = vi.fn()

const mockSafeInfo = ref<MockSafeInfo | null>(null)
const mockFetchSafeInfo = vi.fn()

// Mock external dependencies
vi.mock('@/composables/safe', () => ({
  useSafe: vi.fn(() => mockUseSafe)
}))

vi.mock('@wagmi/vue', () => ({
  useChainId: vi.fn(() => mockUseChainId)
}))

vi.mock('@/stores', () => ({
  useTeamStore: vi.fn(() => mockTeamStore)
}))

// Test constants with proper typing
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
      '0x2222222222222222222222222222222222222222' as Address
    ]
  } as MockSafeInfo,
  team: {
    safeAddress: '0x1234567890123456789012345678901234567890' as Address,
    id: '1',
    name: 'Test Team'
  } as MockTeam
} as const

// Component stubs with proper typing
const CardStub = defineComponent({
  template: `
    <div data-test="card-component">
      <div data-test="card-header"><slot name="header" /></div>
      <div data-test="card-body"><slot /></div>
      <div v-if="$slots.footer" data-test="card-footer"><slot name="footer" /></div>
    </div>
  `
})

const ButtonStub = defineComponent({
  props: ['variant', 'size', 'disabled', 'class'],
  emits: ['click'],
  template: `
    <button 
      data-test="button" 
      :disabled="disabled"
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

describe('SafeOwnersCard', () => {
  let wrapper: VueWrapper<InstanceType<typeof SafeOwnersCard>>

  const createWrapper = () =>
    mount(SafeOwnersCard, {
      global: {
        stubs: {
          CardComponent: CardStub,
          ButtonUI: ButtonStub,
          AddressToolTip: AddressToolTipStub
        }
      }
    })

  beforeEach(() => {
    vi.clearAllMocks()

    // Reset mock implementations
    mockUseSafe.useSafeOwners.mockReturnValue({
      owners: mockOwners,
      isLoading: mockIsLoading,
      error: mockError,
      fetchOwners: mockFetchOwners
    })

    mockUseSafe.useSafeInfo.mockReturnValue({
      safeInfo: mockSafeInfo,
      fetchSafeInfo: mockFetchSafeInfo
    })

    // FIX: useSafeAppUrls is a function that returns an object
    mockUseSafe.useSafeAppUrls.mockReturnValue(mockSafeAppUrlsReturn)

    mockSafeAppUrlsReturn.getSafeSettingsUrl.mockReturnValue(
      'https://app.safe.global/settings/setup?safe=polygon:0x1234567890123456789012345678901234567890'
    )
    mockSafeAppUrlsReturn.openSafeAppUrl.mockImplementation(() => {})

    // Reset reactive values with proper typing
    mockOwners.value = []
    mockIsLoading.value = false
    mockError.value = null
    mockSafeInfo.value = null
    mockUseChainId.value = 137
    mockTeamStore.currentTeam = MOCK_DATA.team
  })

  afterEach(() => {
    if (wrapper) wrapper.unmount()
  })

  describe('Component Rendering', () => {
    it('should render correctly with default state', () => {
      wrapper = createWrapper()

      expect(wrapper.find('[data-test="card-component"]').exists()).toBe(true)
      expect(wrapper.find('[data-test="card-header"]').exists()).toBe(true)
      expect(wrapper.text()).toContain('Safe Owners')
    })

    it('should display threshold information in header', () => {
      mockSafeInfo.value = MOCK_DATA.safeInfo
      mockOwners.value = [...MOCK_DATA.owners]
      wrapper = createWrapper()

      expect(wrapper.text()).toContain('2 of 3 required')
      expect(wrapper.text()).toContain('Safe Owners')
    })

    it('should render manage button in header', () => {
      wrapper = createWrapper()

      const manageButton = wrapper.find('[data-test="manage-owners-button"]')
      expect(manageButton.exists()).toBe(true)
      expect(manageButton.text()).toContain('Manage')
    })
  })

  describe('Loading States', () => {
    it('should show loading spinner when data is fetching', () => {
      mockIsLoading.value = true
      wrapper = createWrapper()

      expect(wrapper.find('.animate-spin').exists()).toBe(true)
      expect(wrapper.find('.border-primary').exists()).toBe(true)
    })

    it('should hide content during loading', () => {
      mockIsLoading.value = true
      wrapper = createWrapper()

      expect(wrapper.find('[data-test="owner-item"]').exists()).toBe(false)
      expect(wrapper.find('[data-test="card-footer"]').exists()).toBe(false)
    })

    it('should show content after loading completes', async () => {
      mockIsLoading.value = true
      mockOwners.value = [...MOCK_DATA.owners]
      wrapper = createWrapper()

      expect(wrapper.find('.animate-spin').exists()).toBe(true)

      mockIsLoading.value = false
      await nextTick()

      expect(wrapper.find('.animate-spin').exists()).toBe(false)
      expect(wrapper.findAll('[data-test="owner-item"]')).toHaveLength(3)
    })
  })

  describe('Error Handling', () => {
    it('should display error message when fetch fails', () => {
      mockError.value = 'Failed to load Safe owners'
      wrapper = createWrapper()

      expect(wrapper.text()).toContain('Failed to load Safe owners')
      expect(wrapper.find('.text-red-600').exists()).toBe(true)
    })

    it('should not show owners list when there is an error', () => {
      mockError.value = 'Network error'
      mockOwners.value = [...MOCK_DATA.owners]
      wrapper = createWrapper()

      expect(wrapper.find('[data-test="owner-item"]').exists()).toBe(false)
      expect(wrapper.text()).toContain('Network error')
    })

    it('should hide footer when there is an error', () => {
      mockError.value = 'API error'
      wrapper = createWrapper()

      expect(wrapper.find('[data-test="card-footer"]').exists()).toBe(false)
    })
  })

  describe('Empty State', () => {
    it('should show empty state when no owners found', () => {
      mockOwners.value = []
      wrapper = createWrapper()

      expect(wrapper.text()).toContain('No owners found')
      expect(wrapper.find('[data-test="owner-item"]').exists()).toBe(false)
    })

    it('should show correct threshold display with no owners', () => {
      mockOwners.value = []
      mockSafeInfo.value = { ...MOCK_DATA.safeInfo, threshold: 1 }
      wrapper = createWrapper()

      expect(wrapper.text()).toContain('1 of 0 required')
    })

    it('should not show footer when no owners', () => {
      mockOwners.value = []
      wrapper = createWrapper()

      expect(wrapper.find('[data-test="card-footer"]').exists()).toBe(false)
    })
  })

  describe('Owners List Display', () => {
    beforeEach(() => {
      mockOwners.value = [...MOCK_DATA.owners]
      mockSafeInfo.value = MOCK_DATA.safeInfo
    })

    it('should display all owners correctly', () => {
      wrapper = createWrapper()

      const ownerItems = wrapper.findAll('[data-test="owner-item"]')
      expect(ownerItems).toHaveLength(3)
    })

    it('should display owner addresses with proper numbering', () => {
      wrapper = createWrapper()

      const ownerItems = wrapper.findAll('[data-test="owner-item"]')

      // Check first owner
      expect(ownerItems[0]?.text()).toContain('1')
      expect(ownerItems[0]?.find('[data-test="address-tooltip"]')?.text()).toBe(MOCK_DATA.owners[0])

      // Check second owner
      expect(ownerItems[1]?.text()).toContain('2')
      expect(ownerItems[1]?.find('[data-test="address-tooltip"]')?.text()).toBe(MOCK_DATA.owners[1])

      // Check third owner
      expect(ownerItems[2]?.text()).toContain('3')
      expect(ownerItems[2]?.find('[data-test="address-tooltip"]')?.text()).toBe(MOCK_DATA.owners[2])
    })

    it('should display owner role correctly', () => {
      wrapper = createWrapper()

      const ownerItems = wrapper.findAll('[data-test="owner-item"]')
      ownerItems.forEach((item) => {
        expect(item.text()).toContain('Owner')
      })
    })

    it('should display configure buttons for each owner', () => {
      wrapper = createWrapper()

      const configureButtons = wrapper.findAll('[data-test="copy-owner-button"]')
      expect(configureButtons).toHaveLength(3)

      configureButtons.forEach((button) => {
        expect(button.text()).toContain('Configure')
        expect((button.element as HTMLButtonElement).disabled).toBe(true) // Currently disabled
      })
    })

    it('should show total owners in footer', () => {
      wrapper = createWrapper()

      expect(wrapper.find('[data-test="card-footer"]').exists()).toBe(true)
      expect(wrapper.text()).toContain('Total: 3 owners')
    })

    it('should show manage button in footer', () => {
      wrapper = createWrapper()

      const footerButton = wrapper.find('[data-test="open-safe-app-footer"]')
      expect(footerButton.exists()).toBe(true)
      expect(footerButton.text()).toContain('Manage in Safe App')
    })
  })

  describe('Safe App Integration', () => {
    beforeEach(() => {
      mockOwners.value = [...MOCK_DATA.owners]
    })

    it('should open Safe settings when header manage button is clicked', async () => {
      wrapper = createWrapper()

      await wrapper.find('[data-test="manage-owners-button"]').trigger('click')

      expect(mockSafeAppUrlsReturn.getSafeSettingsUrl).toHaveBeenCalledWith(
        137,
        MOCK_DATA.safeAddress
      )
      expect(mockSafeAppUrlsReturn.openSafeAppUrl).toHaveBeenCalledWith(
        'https://app.safe.global/settings/setup?safe=polygon:0x1234567890123456789012345678901234567890'
      )
    })

    it('should open Safe settings when footer button is clicked', async () => {
      wrapper = createWrapper()

      await wrapper.find('[data-test="open-safe-app-footer"]').trigger('click')

      expect(mockSafeAppUrlsReturn.getSafeSettingsUrl).toHaveBeenCalledWith(
        137,
        MOCK_DATA.safeAddress
      )
      expect(mockSafeAppUrlsReturn.openSafeAppUrl).toHaveBeenCalledWith(
        'https://app.safe.global/settings/setup?safe=polygon:0x1234567890123456789012345678901234567890'
      )
    })

    it('should update Safe app URL when chain changes', async () => {
      wrapper = createWrapper()

      mockUseChainId.value = 11155111 // Sepolia
      await nextTick()

      await wrapper.find('[data-test="manage-owners-button"]').trigger('click')

      expect(mockSafeAppUrlsReturn.getSafeSettingsUrl).toHaveBeenCalledWith(
        11155111,
        MOCK_DATA.safeAddress
      )
    })
  })

  describe('Data Fetching', () => {
    it('should fetch owners and Safe info on mount when Safe address exists', () => {
      wrapper = createWrapper()

      expect(mockFetchOwners).toHaveBeenCalledTimes(1)
      expect(mockFetchSafeInfo).toHaveBeenCalledTimes(1)
    })

    it('should not fetch data on mount when no Safe address', () => {
      const teamWithoutSafeAddress: MockTeam = { ...MOCK_DATA.team }
      delete teamWithoutSafeAddress.safeAddress
      mockTeamStore.currentTeam = teamWithoutSafeAddress
      wrapper = createWrapper()

      expect(mockFetchOwners).not.toHaveBeenCalled()
      expect(mockFetchSafeInfo).not.toHaveBeenCalled()
    })

    it('should refetch data when Safe address changes', async () => {
      wrapper = createWrapper()
      expect(mockFetchOwners).toHaveBeenCalledTimes(1)

      // Simulate Safe address change
      mockTeamStore.currentTeam = {
        ...MOCK_DATA.team,
        safeAddress: '0x9999999999999999999999999999999999999999' as Address
      }
      await nextTick()

      expect(mockFetchOwners).toHaveBeenCalledTimes(2)
      expect(mockFetchSafeInfo).toHaveBeenCalledTimes(2)
    })

    it('should refetch data when chain changes', async () => {
      wrapper = createWrapper()
      expect(mockFetchOwners).toHaveBeenCalledTimes(1)

      mockUseChainId.value = 11155111 // Change to Sepolia
      await nextTick()

      expect(mockFetchOwners).toHaveBeenCalledTimes(2)
      expect(mockFetchSafeInfo).toHaveBeenCalledTimes(2)
    })
  })

  describe('Threshold Display', () => {
    it('should show correct threshold when Safe info is available', () => {
      mockOwners.value = [...MOCK_DATA.owners]
      mockSafeInfo.value = MOCK_DATA.safeInfo
      wrapper = createWrapper()

      expect(wrapper.text()).toContain('2 of 3 required')
    })

    it('should show fallback threshold when Safe info is not available', () => {
      mockOwners.value = [...MOCK_DATA.owners]
      mockSafeInfo.value = null
      wrapper = createWrapper()

      expect(wrapper.text()).toContain('0 of 3 required')
    })

    it('should update threshold display when Safe info changes', async () => {
      mockOwners.value = [...MOCK_DATA.owners]
      mockSafeInfo.value = MOCK_DATA.safeInfo
      wrapper = createWrapper()

      expect(wrapper.text()).toContain('2 of 3 required')

      // Update Safe info
      const updatedSafeInfo: MockSafeInfo = { ...MOCK_DATA.safeInfo, threshold: 3 }
      mockSafeInfo.value = updatedSafeInfo
      await nextTick()

      expect(wrapper.text()).toContain('3 of 3 required')
    })
  })

  describe('Reactivity', () => {
    it('should update display when owners list changes', async () => {
      mockOwners.value = [MOCK_DATA.owners[0]]
      wrapper = createWrapper()

      expect(wrapper.findAll('[data-test="owner-item"]')).toHaveLength(1)

      // Add more owners
      mockOwners.value = [...MOCK_DATA.owners]
      await nextTick()

      expect(wrapper.findAll('[data-test="owner-item"]')).toHaveLength(3)
      expect(wrapper.text()).toContain('Total: 3 owners')
    })

    it('should toggle between loading and content states', async () => {
      mockIsLoading.value = true
      wrapper = createWrapper()

      expect(wrapper.find('.animate-spin').exists()).toBe(true)
      expect(wrapper.find('[data-test="owner-item"]').exists()).toBe(false)

      mockIsLoading.value = false
      mockOwners.value = [...MOCK_DATA.owners]
      await nextTick()

      expect(wrapper.find('.animate-spin').exists()).toBe(false)
      expect(wrapper.findAll('[data-test="owner-item"]')).toHaveLength(3)
    })

    it('should handle error to success state transition', async () => {
      mockError.value = 'Failed to load'
      wrapper = createWrapper()

      expect(wrapper.text()).toContain('Failed to load')
      expect(wrapper.find('[data-test="owner-item"]').exists()).toBe(false)

      mockError.value = null
      mockOwners.value = [...MOCK_DATA.owners]
      await nextTick()

      expect(wrapper.text()).not.toContain('Failed to load')
      expect(wrapper.findAll('[data-test="owner-item"]')).toHaveLength(3)
    })
  })

  describe('Accessibility', () => {
    beforeEach(() => {
      mockOwners.value = [...MOCK_DATA.owners]
    })

    it('should have proper button attributes', () => {
      wrapper = createWrapper()

      const manageButton = wrapper.find('[data-test="manage-owners-button"]')
      expect(manageButton.exists()).toBe(true)

      const configureButtons = wrapper.findAll('[data-test="copy-owner-button"]')
      expect(configureButtons.length).toBeGreaterThan(0)
    })

    it('should provide clear visual hierarchy', () => {
      wrapper = createWrapper()

      // Check for proper text content organization
      expect(wrapper.text()).toContain('Safe Owners')
      expect(wrapper.text()).toContain('required')
      expect(wrapper.text()).toContain('Owner')
      expect(wrapper.text()).toContain('Total:')
    })

    it('should have consistent numbering for owners', () => {
      wrapper = createWrapper()

      const ownerItems = wrapper.findAll('[data-test="owner-item"]')
      ownerItems.forEach((item, index) => {
        expect(item.text()).toContain(`${index + 1}`)
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle single owner correctly', async () => {
      const singleOwnerInfo: MockSafeInfo = {
        ...MOCK_DATA.safeInfo,
        threshold: 1,
        owners: [MOCK_DATA.owners[0]]
      }

      mockOwners.value = [MOCK_DATA.owners[0]]
      mockSafeInfo.value = singleOwnerInfo
      wrapper = createWrapper()

      expect(wrapper.findAll('[data-test="owner-item"]')).toHaveLength(1)
      expect(wrapper.text()).toContain('1 of 1 required')
      expect(wrapper.text()).toContain('Total: 1 owners')
    })

    it('should handle many owners correctly', async () => {
      const manyOwners = Array.from(
        { length: 10 },
        (_, i) => `0x${i.toString().padStart(40, '0')}` as Address
      )
      const manyOwnersInfo: MockSafeInfo = {
        ...MOCK_DATA.safeInfo,
        threshold: 7,
        owners: manyOwners
      }

      mockOwners.value = manyOwners
      mockSafeInfo.value = manyOwnersInfo
      wrapper = createWrapper()

      expect(wrapper.findAll('[data-test="owner-item"]')).toHaveLength(10)
      expect(wrapper.text()).toContain('7 of 10 required')
      expect(wrapper.text()).toContain('Total: 10 owners')
    })

    it('should maintain component stability during rapid updates', async () => {
      wrapper = createWrapper()

      // Rapidly change owners
      for (let i = 1; i <= 5; i++) {
        mockOwners.value = [...MOCK_DATA.owners].slice(0, i)
        await nextTick()
      }

      expect(wrapper.findAll('[data-test="owner-item"]')).toHaveLength(3)
      expect(wrapper.text()).toContain('Total: 3 owners')
    })

    it('should handle undefined team gracefully', async () => {
      mockTeamStore.currentTeam = null
      wrapper = createWrapper()

      expect(wrapper.find('[data-test="card-component"]').exists()).toBe(true)
      expect(mockFetchOwners).not.toHaveBeenCalled()
    })

    it('should handle empty Safe info gracefully', async () => {
      mockOwners.value = [...MOCK_DATA.owners]
      mockSafeInfo.value = null
      wrapper = createWrapper()

      expect(wrapper.text()).toContain('0 of 3 required') // Fallback threshold
      expect(wrapper.findAll('[data-test="owner-item"]')).toHaveLength(3)
    })
  })
})
