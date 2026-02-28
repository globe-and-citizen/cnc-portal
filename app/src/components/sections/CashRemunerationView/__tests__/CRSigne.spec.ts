import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import CRSigne from '../CRSigne.vue'
import { createPinia, setActivePinia } from 'pinia'
import type { WeeklyClaim, ContractType } from '@/types'
import { nextTick } from 'vue'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import isoWeek from 'dayjs/plugin/isoWeek'
import { USDC_ADDRESS } from '@/constant'
import {
  mockTeamStore,
  mockToastStore,
  mockUserStore,
  mockUseReadContract,
  mockUseSignTypedData,
  mockWagmiCore
} from '@/tests/mocks'
import { createMockMutationResponse } from '@/tests/mocks/query.mock'
import { useUpdateWeeklyClaimMutation } from '@/queries'

// Configure dayjs plugins
dayjs.extend(utc)
dayjs.extend(isoWeek)

describe('CRSigne', () => {
  let wrapper: ReturnType<typeof mount>

  const MOCK_OWNER_ADDRESS = '0x1234567890123456789012345678901234567890'
  const MOCK_CONTRACT_ADDRESS = '0x9876543210987654321098765432109876543210'

  const mockClaim: WeeklyClaim = {
    id: 1,
    status: 'pending',
    hoursWorked: 8,
    createdAt: '2024-01-01T00:00:00Z',
    wage: {
      userAddress: MOCK_OWNER_ADDRESS,
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
    weekStart: '2024-01-01T00:00:00Z',
    data: {
      ownerAddress: MOCK_OWNER_ADDRESS
    },
    memberAddress: MOCK_OWNER_ADDRESS,
    teamId: 0,
    signature: null,
    wageId: 0,
    updatedAt: '',
    claims: []
  }

  type WrapperProps = {
    weeklyClaim: WeeklyClaim
    disabled?: boolean
    isDropDown?: boolean
    isResign?: boolean
  }

  const createWrapper = (props: Partial<WrapperProps> = {}) => {
    wrapper = mount(CRSigne, {
      props: {
        weeklyClaim: mockClaim,
        ...props
      }
    })

    return wrapper
  }

  const clickApprove = async () => {
    await wrapper.find('[data-test="approve-button"]').trigger('click')
    await flushPromises()
  }

  const clickDropdownAction = async () => {
    await wrapper.find('[data-test="sign-action"]').trigger('click')
    await flushPromises()
  }

  const setSignTypedDataResult = (signature: string | null) => {
    mockUseSignTypedData.data.value = signature as string
    if (signature) {
      mockUseSignTypedData.mutateAsync.mockResolvedValue(signature)
    }
  }

  const resetWagmiCoreMocks = () => {
    mockWagmiCore.readContract.mockReset()
    mockWagmiCore.simulateContract.mockReset()
    mockWagmiCore.writeContract.mockReset()
    mockWagmiCore.waitForTransactionReceipt.mockReset()
  }

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()

    mockTeamStore.getContractAddressByType = vi.fn((type: ContractType) => {
      if (type === 'CashRemunerationEIP712') return MOCK_CONTRACT_ADDRESS
      if (type === 'InvestorV1') return '0x1111111111111111111111111111111111111111'
      return ''
    })
    mockTeamStore.currentTeam = {
      id: '1',
      name: 'Test Team',
      description: 'Test Description',
      ownerAddress: MOCK_OWNER_ADDRESS,
      members: [],
      teamContracts: [
        {
          type: 'CashRemunerationEIP712',
          address: MOCK_CONTRACT_ADDRESS,
          deployer: MOCK_OWNER_ADDRESS,
          admins: []
        }
      ]
    }

    mockUserStore.address = MOCK_OWNER_ADDRESS
    mockUseReadContract.data.value = MOCK_OWNER_ADDRESS
    mockUseReadContract.error.value = null
    setSignTypedDataResult('0xmocksignature')
    resetWagmiCoreMocks()
  })

  afterEach(() => {
    if (wrapper) wrapper.unmount()
  })

  describe('Approve Functionality', () => {
    it('should build typed data with correct token addresses', async () => {
      const customClaim: WeeklyClaim = {
        ...mockClaim,
        wage: {
          ...mockClaim.wage,
          ratePerHour: [
            { type: 'native', amount: 1 },
            { type: 'usdc', amount: 2 },
            { type: 'sher', amount: 3 }
          ]
        }
      }

      setSignTypedDataResult('0xsignature')

      wrapper = mount(CRSigne, {
        props: {
          weeklyClaim: customClaim
        }
      })

      await clickApprove()

      expect(mockUseSignTypedData.mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.objectContaining({
            wages: [
              expect.objectContaining({
                tokenAddress: '0x0000000000000000000000000000000000000000'
              }),
              expect.objectContaining({ tokenAddress: USDC_ADDRESS }),
              expect.objectContaining({
                tokenAddress: '0x1111111111111111111111111111111111111111'
              })
            ]
          })
        })
      )
    })

    it('should show success toast after successful approval', async () => {
      setSignTypedDataResult('0xsignature')

      createWrapper()
      await clickApprove()

      expect(mockToastStore.addSuccessToast).toHaveBeenCalledWith('Claim approved')
    })

    it('Should emit close event after approve', async () => {
      createWrapper({ isDropDown: true })

      const button = wrapper.findComponent({ name: 'ButtonUI' })
      expect(button.exists()).toBeFalsy()
      const signAction = wrapper.find('[data-test="sign-action"]')
      expect(signAction.exists()).toBeTruthy()
      await clickDropdownAction()
      expect(wrapper.emitted()).toHaveProperty('close')
    })

    it('should emit close when user is not owner', async () => {
      mockUseReadContract.data.value = '0x9999999999999999999999999999999999999999'

      createWrapper({ isDropDown: true })

      await clickDropdownAction()

      expect(mockUseSignTypedData.mutateAsync).not.toHaveBeenCalled()
      expect(wrapper.emitted()).toHaveProperty('close')
    })

    it('should skip dropdown click when loading', async () => {
      let resolvePending: (() => void) | undefined
      const pending = new Promise<void>((resolve) => {
        resolvePending = resolve
      })

      setSignTypedDataResult('0xsignature')
      mockUseSignTypedData.mutateAsync.mockReturnValueOnce(pending)

      createWrapper({ isDropDown: true })

      await flushPromises()
      const signAction = wrapper.find('[data-test="sign-action"]')

      await signAction.trigger('click')
      await nextTick()

      await signAction.trigger('click')
      await nextTick()

      expect(mockUseSignTypedData.mutateAsync).toHaveBeenCalledTimes(1)

      resolvePending?.()
      await flushPromises()
    })
  })

  describe('Error Handling', () => {
    it('should show error toast when user rejects signature', async () => {
      mockUseSignTypedData.data.value = ''
      mockUseSignTypedData.mutateAsync.mockRejectedValue(new Error('User rejected the request'))

      createWrapper()
      await clickApprove()

      expect(mockToastStore.addErrorToast).toHaveBeenCalledWith('User rejected the request')
    })

    it('should show error toast when signature is missing', async () => {
      mockUseSignTypedData.data.value = ''
      mockUseSignTypedData.mutateAsync.mockResolvedValue('0xsignature')

      createWrapper()
      await clickApprove()

      expect(mockToastStore.addErrorToast).toHaveBeenCalledWith('Signature not found')
    })

    it('should show error toast when claim update fails', async () => {
      vi.mocked(useUpdateWeeklyClaimMutation).mockReturnValueOnce(
        createMockMutationResponse(null, false, new Error('Update failed')) as ReturnType<
          typeof useUpdateWeeklyClaimMutation
        >
      )

      createWrapper()
      await clickApprove()

      expect(mockToastStore.addErrorToast).toHaveBeenCalledWith('Failed to approve weeklyClaim')
    })

    it('should show error toast when cash remuneration address is missing', async () => {
      mockTeamStore.getContractAddressByType = vi.fn((type: ContractType) => {
        if (type === 'CashRemunerationEIP712') return ''
        if (type === 'InvestorV1') return '0x1111111111111111111111111111111111111111'
        return ''
      })
      setSignTypedDataResult('0xsignature')

      createWrapper({ isResign: true })
      await clickApprove()

      expect(mockToastStore.addErrorToast).toHaveBeenCalledWith('Failed to sign weeklyClaim')
    })

    it('should handle resign flow when claim is disabled', async () => {
      mockWagmiCore.readContract.mockResolvedValue(true)
      mockWagmiCore.simulateContract.mockResolvedValue(undefined)
      mockWagmiCore.writeContract.mockResolvedValue('0xhash')
      mockWagmiCore.waitForTransactionReceipt.mockResolvedValue({})

      createWrapper({ isResign: true })
      await clickApprove()

      expect(mockWagmiCore.readContract).toHaveBeenCalled()
      expect(mockWagmiCore.simulateContract).toHaveBeenCalled()
      expect(mockWagmiCore.writeContract).toHaveBeenCalled()
      expect(mockWagmiCore.waitForTransactionReceipt).toHaveBeenCalled()
      expect(mockToastStore.addSuccessToast).toHaveBeenCalledWith('Claim approved')
    })

    it('should skip enable flow when claim is not disabled', async () => {
      mockWagmiCore.readContract.mockResolvedValue(false)

      createWrapper({ isResign: true })
      await clickApprove()

      expect(mockWagmiCore.readContract).toHaveBeenCalled()
      expect(mockWagmiCore.simulateContract).not.toHaveBeenCalled()
      expect(mockWagmiCore.writeContract).not.toHaveBeenCalled()
      expect(mockWagmiCore.waitForTransactionReceipt).not.toHaveBeenCalled()
    })

    it('should show error toast when cash remuneration owner fetch fails', async () => {
      createWrapper()
      await nextTick()
      mockUseReadContract.error.value = new Error('Fetch failed') as unknown as null
      await nextTick()

      expect(mockToastStore.addErrorToast).toHaveBeenCalledWith(
        'Failed to fetch cash remuneration owner'
      )
    })
  })
})
