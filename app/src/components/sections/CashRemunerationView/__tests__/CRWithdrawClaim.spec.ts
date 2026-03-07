import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick, ref } from 'vue'
import { parseEther, zeroAddress, type Address } from 'viem'
import CRWithdrawClaim from '../CRWithdrawClaim.vue'
import type { WeeklyClaim } from '@/types'
import { USDC_ADDRESS } from '@/constant'
import { useSyncWeeklyClaimsMutation } from '@/queries'
import {
  mockTeamStore,
  mockToastStore,
  mockGetBalance,
  mockUseWriteContract,
  mockWagmiCore
} from '@/tests/mocks'

type WrapperProps = {
  weeklyClaim: WeeklyClaim
  disabled?: boolean
  isDropDown?: boolean
  isClaimOwner?: boolean
}

const BUTTON_STUB = {
  template: '<button v-bind="$attrs" @click="$emit(\'click\')"><slot /></button>'
}

describe('CRWithdrawClaim', () => {
  let wrapper: ReturnType<typeof mount>

  const MOCK_CONTRACT_ADDRESS = '0x9876543210987654321098765432109876543210'
  const MOCK_INVESTOR_ADDRESS = '0x1111111111111111111111111111111111111111'

  const mockClaim: WeeklyClaim = {
    id: 1,
    status: 'signed',
    weekStart: '2024-01-01T00:00:00Z',
    data: {
      ownerAddress: '0xOwnerAddress' as Address
    },
    memberAddress: '0xEmployeeAddress' as Address,
    teamId: 1,
    signature: '0xSignature',
    wageId: 1,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    hoursWorked: 40,
    wage: {
      id: 1,
      teamId: 1,
      userAddress: '0xEmployeeAddress' as Address,
      ratePerHour: [
        {
          type: 'native' as const,
          amount: 0.1
        }
      ],
      maximumHoursPerWeek: 40,
      nextWageId: null,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    },
    claims: []
  }

  const createWrapper = (props: Partial<WrapperProps> = {}) => {
    wrapper = mount(CRWithdrawClaim, {
      props: {
        weeklyClaim: mockClaim,
        disabled: false,
        ...props
      },
      global: {
        stubs: {
          ButtonUI: BUTTON_STUB
        }
      }
    })

    return wrapper
  }

  const clickWithdrawButton = async () => {
    await wrapper.find('[data-test="withdraw-button"]').trigger('click')
    await flushPromises()
  }

  const clickWithdrawAction = async () => {
    await wrapper.find('[data-test="withdraw-action"]').trigger('click')
    await flushPromises()
  }

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()

    mockTeamStore.getContractAddressByType = vi.fn((type: string) => {
      if (type === 'CashRemunerationEIP712') return MOCK_CONTRACT_ADDRESS
      if (type === 'InvestorV1') return MOCK_INVESTOR_ADDRESS
      return MOCK_CONTRACT_ADDRESS
    })
    mockTeamStore.currentTeamId = '1'

    mockUseWriteContract.mutateAsync = vi.fn().mockResolvedValue('0xhash')
    mockWagmiCore.simulateContract.mockResolvedValue(undefined)
    mockWagmiCore.waitForTransactionReceipt.mockResolvedValue({ status: 'success' })

    mockGetBalance.mockResolvedValue(parseEther('100'))
  })

  afterEach(() => {
    if (wrapper) wrapper.unmount()
  })

  it('withdraws successfully via button', async () => {
    createWrapper()
    await clickWithdrawButton()

    expect(mockToastStore.addSuccessToast).toHaveBeenCalledWith('Claim withdrawn')
    expect(mockWagmiCore.waitForTransactionReceipt).toHaveBeenCalled()
  })

  it('withdraws and emits from dropdown when owner', async () => {
    createWrapper({ isDropDown: true, isClaimOwner: true })

    await clickWithdrawAction()

    expect(wrapper.emitted()).toHaveProperty('claim-withdrawn')
  })

  it('emits without withdrawing when dropdown user is not owner', async () => {
    createWrapper({ isDropDown: true, isClaimOwner: false })

    await clickWithdrawAction()

    expect(mockWagmiCore.simulateContract).not.toHaveBeenCalled()
    expect(wrapper.emitted()).toHaveProperty('claim-withdrawn')
  })

  it('skips dropdown click while loading', async () => {
    let resolvePending: (() => void) | undefined
    const pending = new Promise<void>((resolve) => {
      resolvePending = resolve
    })

    mockUseWriteContract.mutateAsync = vi.fn().mockReturnValueOnce(pending)

    createWrapper({ isDropDown: true, isClaimOwner: true })

    const action = wrapper.find('[data-test="withdraw-action"]')
    await action.trigger('click')
    await nextTick()

    await action.trigger('click')
    await nextTick()

    expect(mockUseWriteContract.mutateAsync).toHaveBeenCalledTimes(1)

    resolvePending?.()
    await flushPromises()
  })

  it('shows error when contract address is missing', async () => {
    mockTeamStore.getContractAddressByType = vi.fn((type: string) => {
      if (type === 'CashRemunerationEIP712') return ''
      if (type === 'InvestorV1') return MOCK_INVESTOR_ADDRESS
      return ''
    })

    createWrapper()
    await clickWithdrawButton()

    expect(mockToastStore.addErrorToast).toHaveBeenCalledWith(
      'Cash Remuneration EIP712 contract address not found'
    )
  })

  it('shows insufficient balance error before withdraw', async () => {
    mockGetBalance.mockResolvedValueOnce(parseEther('0.01'))

    createWrapper()
    await clickWithdrawButton()

    expect(mockToastStore.addErrorToast).toHaveBeenCalledWith('Insufficient balance')
    expect(mockGetBalance).toHaveBeenCalled()
  })

  it('builds claim data with correct token addresses', async () => {
    const customClaim: WeeklyClaim = {
      ...mockClaim,
      wage: {
        ...mockClaim.wage,
        ratePerHour: [
          { type: 'native', amount: 0.1 },
          { type: 'usdc', amount: 2 },
          { type: 'sher', amount: 3 }
        ]
      }
    }

    wrapper = mount(CRWithdrawClaim, {
      props: {
        weeklyClaim: customClaim
      },
      global: {
        stubs: {
          ButtonUI: BUTTON_STUB
        }
      }
    })

    await clickWithdrawButton()

    expect(mockWagmiCore.simulateContract).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        args: [
          expect.objectContaining({
            wages: [
              expect.objectContaining({ tokenAddress: zeroAddress }),
              expect.objectContaining({ tokenAddress: USDC_ADDRESS }),
              expect.objectContaining({ tokenAddress: MOCK_INVESTOR_ADDRESS })
            ]
          }),
          '0xSignature'
        ]
      })
    )
  })

  it('shows error when transaction receipt is not success', async () => {
    mockWagmiCore.waitForTransactionReceipt.mockResolvedValueOnce({ status: 'reverted' })

    createWrapper()
    await clickWithdrawButton()

    expect(mockToastStore.addErrorToast).toHaveBeenCalledWith(
      'Transaction failed: Failed to withdraw claim'
    )
  })

  it('shows error when sync weekly claim fails', async () => {
    const syncMutation = {
      mutateAsync: vi.fn().mockResolvedValue(undefined),
      error: ref(new Error('Sync failed'))
    }

    vi.mocked(useSyncWeeklyClaimsMutation).mockReturnValueOnce(
      syncMutation as unknown as ReturnType<typeof useSyncWeeklyClaimsMutation>
    )

    createWrapper()
    await clickWithdrawButton()

    expect(syncMutation.mutateAsync).toHaveBeenCalledWith({ queryParams: { teamId: '1' } })
    expect(mockToastStore.addErrorToast).toHaveBeenCalledWith('Failed to update Claim status')
  })

  it('shows token balance error when parsing revert', async () => {
    mockWagmiCore.simulateContract.mockRejectedValueOnce(new Error('Insufficient token balance'))

    createWrapper()
    await clickWithdrawButton()

    expect(mockToastStore.addErrorToast).toHaveBeenCalledWith('Insufficient token balance')
  })

  it('shows token support error when parsing revert', async () => {
    mockWagmiCore.simulateContract.mockRejectedValueOnce(new Error('Token not supported'))

    createWrapper()
    await clickWithdrawButton()

    expect(mockToastStore.addErrorToast).toHaveBeenCalledWith(
      'Add Token support: Token not supported'
    )
  })

  it('shows parsed error for unknown failures', async () => {
    mockWagmiCore.simulateContract.mockRejectedValueOnce(new Error('Unknown failure'))

    createWrapper()
    await clickWithdrawButton()

    expect(mockToastStore.addErrorToast).toHaveBeenCalledWith('Unknown failure')
  })
})
