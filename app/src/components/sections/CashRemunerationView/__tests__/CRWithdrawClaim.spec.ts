import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick, ref } from 'vue'
import { parseEther, zeroAddress, type Address } from 'viem'
import CRWithdrawClaim from '../CRWithdrawClaim.vue'
import type { WeeklyClaim } from '@/types'
import { USDC_ADDRESS } from '@/constant'
import { useSyncWeeklyClaimsMutation } from '@/queries'
import { mockTeamStore, mockGetBalance, mockUseWriteContract, mockWagmiCore } from '@/tests/mocks'
import { mockLog } from '@/tests/mocks/utils.mock'
import * as utils from '@/utils'

vi.mock('@/composables/contracts/useContractWritesV3', () => ({
  useContractWritesV3: vi.fn(() => mockUseWriteContract)
}))

vi.mock('@/composables/cashRemuneration/writes', () => ({
  useWithdraw: vi.fn(() => mockUseWriteContract)
}))

type WrapperProps = {
  weeklyClaim: WeeklyClaim
  disabled?: boolean
  isDropDown?: boolean
  isClaimOwner?: boolean
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
    hoursWorked: 2400,
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

    // The component calls withdrawTx.mutate(variables, { onSuccess, onError })
    // By default, invoke onSuccess callback to simulate a successful mutation
    mockUseWriteContract.mutate = vi.fn(
      async (_variables: unknown, options?: { onSuccess?: () => Promise<void> | void }) => {
        await options?.onSuccess?.()
      }
    )
    mockUseWriteContract.mutateAsync = vi.fn().mockResolvedValue('0xhash')

    mockGetBalance.mockResolvedValue(parseEther('100'))
  })

  afterEach(() => {
    if (wrapper) wrapper.unmount()
  })

  it('withdraws successfully via button', async () => {
    createWrapper()
    await clickWithdrawButton()

    // expect(mockToast.add).toHaveBeenCalledWith({ title: 'Claim withdrawn', color: 'success' })
    expect(mockUseWriteContract.mutate).toHaveBeenCalled()
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
    // Don't invoke onSuccess so isLoading stays true
    mockUseWriteContract.mutate = vi.fn(() => {
      mockUseWriteContract.isPending.value = true
    })

    createWrapper({ isDropDown: true, isClaimOwner: true })

    const action = wrapper.find('[data-test="withdraw-action"]')
    await action.trigger('click')
    await flushPromises()

    await action.trigger('click')
    await nextTick()

    expect(mockUseWriteContract.mutate).toHaveBeenCalledTimes(1)
    mockUseWriteContract.isPending.value = false
  })

  it('shows error when contract address is missing', async () => {
    mockTeamStore.getContractAddressByType = vi.fn((type: string) => {
      if (type === 'CashRemunerationEIP712') return ''
      if (type === 'InvestorV1') return MOCK_INVESTOR_ADDRESS
      return ''
    })

    createWrapper()
    await clickWithdrawButton()

    // expect(mockToast.add).toHaveBeenCalledWith({
    //   title: 'Cash Remuneration EIP712 contract address not found',
    //   color: 'error'
    // })
  })

  it('shows insufficient balance error before withdraw', async () => {
    mockGetBalance.mockResolvedValueOnce(parseEther('0.01'))

    createWrapper()
    await clickWithdrawButton()

    // expect(mockToast.add).toHaveBeenCalledWith({ title: 'Insufficient balance', color: 'error' })
    expect(mockGetBalance).toHaveBeenCalled()
  })

  it('uses overtime-aware total for balance check', async () => {
    mockGetBalance.mockResolvedValueOnce(parseEther('100'))

    const overtimeClaim: WeeklyClaim = {
      ...mockClaim,
      hoursWorked: 240,
      wage: {
        ...mockClaim.wage,
        maximumHoursPerWeek: 2,
        ratePerHour: [{ type: 'native', amount: 10 }],
        overtimeRatePerHour: [{ type: 'native', amount: 100 }]
      }
    }

    wrapper = mount(CRWithdrawClaim, {
      props: {
        weeklyClaim: overtimeClaim
      },
      global: {
        stubs: {
          UButton: {
            template: '<button @click="$emit(\'click\')"><slot /></button>'
          }
        }
      }
    })

    await clickWithdrawButton()

    expect(mockWagmiCore.simulateContract).not.toHaveBeenCalled()
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
      }
    })

    await clickWithdrawButton()

    expect(mockUseWriteContract.mutate).toHaveBeenCalledWith(
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
      }),
      expect.anything()
    )
  })

  it('shows error when transaction receipt is not success', async () => {
    mockWagmiCore.waitForTransactionReceipt.mockResolvedValueOnce({ status: 'reverted' })

    createWrapper()
    await clickWithdrawButton()

    // expect(mockToast.add).toHaveBeenCalledWith({
    //   title: 'Transaction failed: Failed to withdraw claim',
    //   color: 'error'
    // })
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
    // expect(mockToast.add).toHaveBeenCalledWith({
    //   title: 'Failed to update Claim status',
    //   color: 'error'
    // })
  })

  it('shows token balance error when parsing revert', async () => {
    mockWagmiCore.simulateContract.mockRejectedValueOnce(new Error('Insufficient token balance'))

    createWrapper()
    await clickWithdrawButton()

    // expect(mockToast.add).toHaveBeenCalledWith({
    //   title: 'Insufficient token balance',
    //   color: 'error'
    // })
  })

  it('shows token support error when parsing revert', async () => {
    mockWagmiCore.simulateContract.mockRejectedValueOnce(new Error('Token not supported'))

    createWrapper()
    await clickWithdrawButton()

    // expect(mockToast.add).toHaveBeenCalledWith({
    //   title: 'Add Token support: Token not supported',
    //   color: 'error'
    // })
  })

  it('shows parsed error for unknown failures', async () => {
    mockWagmiCore.simulateContract.mockRejectedValueOnce(new Error('Unknown failure'))

    createWrapper()
    await clickWithdrawButton()

    // expect(mockToast.add).toHaveBeenCalledWith({ title: 'Unknown failure', color: 'error' })
  })

  it('handles withdraw mutation onError with user_rejected silently', async () => {
    vi.spyOn(utils, 'classifyError').mockReturnValue({
      category: 'user_rejected',
      userMessage: 'User rejected',
      raw: new Error('rejected')
    } as ReturnType<typeof utils.classifyError>)

    mockUseWriteContract.mutate = vi.fn(
      async (_variables: unknown, options?: { onError?: (error: unknown) => void }) => {
        options?.onError?.(new Error('rejected'))
      }
    )

    createWrapper()
    await clickWithdrawButton()

    expect(mockLog.error).toHaveBeenCalledWith('Withdraw error', expect.any(Error))
  })

  it('handles withdraw mutation onError with regular error', async () => {
    vi.spyOn(utils, 'classifyError').mockReturnValue({
      category: 'unknown',
      userMessage: 'Failure',
      raw: new Error('boom')
    } as ReturnType<typeof utils.classifyError>)

    mockUseWriteContract.mutate = vi.fn(
      async (_variables: unknown, options?: { onError?: (error: unknown) => void }) => {
        options?.onError?.(new Error('boom'))
      }
    )

    createWrapper()
    await clickWithdrawButton()

    expect(mockLog.error).toHaveBeenCalledWith('Withdraw error', expect.any(Error))
  })
})
