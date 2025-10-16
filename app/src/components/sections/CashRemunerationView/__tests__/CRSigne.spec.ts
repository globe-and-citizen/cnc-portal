import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import CRSigne from '../CRSigne.vue'
import { createPinia, setActivePinia } from 'pinia'
import { useTeamStore, useUserDataStore, useToastStore } from '@/stores'
import { useSignTypedData } from '@wagmi/vue'
import { useCustomFetch } from '@/composables'
import type { WeeklyClaim } from '@/types'
import { ref } from 'vue'

// Mock the stores and composables
vi.mock('@/stores', () => ({
  useTeamStore: vi.fn(),
  useUserDataStore: vi.fn(),
  useToastStore: vi.fn()
}))

vi.mock('@wagmi/vue', async (importOriginal) => ({
  ...(await importOriginal()),
  useSignTypedData: vi.fn(),
  useChainId: vi.fn(() => ({ value: 1 }))
}))

vi.mock('@/composables', () => ({
  useCustomFetch: vi.fn(() => ({
    put: () => ({
      json: () => ({
        execute: vi.fn(),
        error: ref(null as Error | null)
      })
    })
  }))
}))

describe.skip('CRSigne', () => {
  const mockClaim: WeeklyClaim = {
    id: 1,
    status: 'pending',
    hoursWorked: 8,
    // signature: null,
    // tokenTx: null,
    // wageId: 1,
    createdAt: '2024-01-01T00:00:00Z',
    // updatedAt: '2024-01-01T00:00:00Z',
    wage: {
      // id: 1,
      // teamId: 1,
      userAddress: '0x1234567890123456789012345678901234567890',
      ratePerHour: [{ type: 'native', amount: 10 }],
      id: 0,
      teamId: 0,
      cashRatePerHour: 0,
      tokenRatePerHour: 0,
      usdcRatePerHour: 0,
      maximumHoursPerWeek: 0,
      nextWageId: null,
      createdAt: '',
      updatedAt: ''
    },
    weekStart: '',
    data: {
      ownerAddress: '0x1234567890123456789012345678901234567890'
    },
    memberAddress: '0x1234567890123456789012345678901234567890',
    teamId: 0,
    signature: null,
    wageId: 0,
    updatedAt: '',
    claims: []
  }

  const mockTeamStore = {
    currentTeam: {
      ownerAddress: '0x1234567890123456789012345678901234567890',
      teamContracts: [
        {
          type: 'CashRemunerationEIP712',
          address: '0x9876543210987654321098765432109876543210'
        }
      ]
    }
  }

  const mockUserDataStore = {
    address: '0x1234567890123456789012345678901234567890'
  }

  const mockToastStore = {
    addErrorToast: vi.fn(),
    addSuccessToast: vi.fn()
  }

  const mockSignTypedData = {
    signTypedDataAsync: vi.fn(),
    data: { value: 'mock-signature' }
  }

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()

      // Setup store mocks
      ; (useTeamStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockTeamStore)
      ; (useUserDataStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockUserDataStore)
      ; (useToastStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockToastStore)
      ; (useSignTypedData as ReturnType<typeof vi.fn>).mockReturnValue(mockSignTypedData)
  })

  it('renders approve button when claim is pending and user is team owner', () => {
    const wrapper = mount(CRSigne, {
      props: {
        weeklyClaim: mockClaim
      }
    })

    expect(wrapper.find('[data-test="approve-button"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Approve')
  })

  it('does not render approve button when claim is not pending', () => {
    const wrapper = mount(CRSigne, {
      props: {
        weeklyClaim: { ...mockClaim, status: 'signed' }
      }
    })

    expect(wrapper.find('[data-test="approve-button"]').exists()).toBe(false)
  })

  it('does not render approve button when user is not team owner', () => {
    ; (useUserDataStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      address: '0x0000000000000000000000000000000000000000'
    })

    const wrapper = mount(CRSigne, {
      props: {
        weeklyClaim: mockClaim
      }
    })

    expect(wrapper.find('[data-test="approve-button"]').exists()).toBe(false)
  })

  it('calls signTypedDataAsync and executeUpdateClaim when approve button is clicked', async () => {
    const wrapper = mount(CRSigne, {
      props: {
        weeklyClaim: mockClaim
      }
    })

    await wrapper.find('[data-test="approve-button"]').trigger('click')

    expect(mockSignTypedData.signTypedDataAsync).toHaveBeenCalled()
  })

  it('shows error toast when signature fails', async () => {
    const error = new Error('User rejected the request')
    mockSignTypedData.signTypedDataAsync.mockRejectedValue(error)

    const wrapper = mount(CRSigne, {
      props: {
        weeklyClaim: mockClaim
      }
    })

    await wrapper.find('[data-test="approve-button"]').trigger('click')

    expect(mockToastStore.addErrorToast).toHaveBeenCalledWith('User rejected the request')
  })

  it('shows error toast when claim update fails', async () => {
    const mockError = ref(new Error('Update failed'))
      ; (useCustomFetch as ReturnType<typeof vi.fn>).mockReturnValue({
        put: () => ({
          json: () => ({
            execute: vi.fn(),
            error: mockError
          })
        })
      })

    const wrapper = mount(CRSigne, {
      props: {
        weeklyClaim: mockClaim
      }
    })

    await wrapper.find('[data-test="approve-button"]').trigger('click')

    expect(mockToastStore.addErrorToast).toHaveBeenCalledWith('Failed to approve claim')
  })
})
