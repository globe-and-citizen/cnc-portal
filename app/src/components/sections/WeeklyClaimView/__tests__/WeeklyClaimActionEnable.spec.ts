import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { keccak256 } from 'viem'
import WeeklyClaimActionEnable from '../WeeklyClaimActionEnable.vue'
import type { WeeklyClaim } from '@/types'
import {
  mockCashRemunerationWrites,
  mockSyncWeeklyClaimsMutation,
  mockTeamStore,
  useQueryClientFn
} from '@/tests/mocks'
import { mockLog } from '@/tests/mocks/utils.mock'
import * as utils from '@/utils'

vi.mock('@/composables/cashRemuneration/writes', () => ({
  useEnableClaim: vi.fn(() => mockCashRemunerationWrites.enableClaim),
  useDisableClaim: vi.fn(() => mockCashRemunerationWrites.disableClaim)
}))

describe('WeeklyClaimActionEnable', () => {
  const weeklyClaim: WeeklyClaim = {
    id: 1,
    status: 'pending',
    hoursWorked: 480,
    createdAt: '2024-01-01T00:00:00Z',
    wage: {
      userAddress: '0xOwnerAddress',
      ratePerHour: [{ type: 'native', amount: 10 }],
      id: 0,
      teamId: 0,
      cashRatePerHour: 0,
      tokenRatePerHour: 0,
      usdcRatePerHour: 0,
      maximumHoursPerWeek: 0,
      nextWageId: null,
      createdAt: '',
      updatedAt: '',
      disabled: false
    },
    weekStart: '2024-01-01T00:00:00Z',
    data: { ownerAddress: '0xOwnerAddress' },
    memberAddress: '0xOwnerAddress',
    teamId: 1,
    signature: '0x1234',
    wageId: 0,
    updatedAt: '',
    claims: []
  }

  const setupSyncMutation = (mutateAsync = vi.fn().mockResolvedValue(undefined)) => {
    mockSyncWeeklyClaimsMutation.mutate.mockClear()
    mockSyncWeeklyClaimsMutation.reset.mockClear()
    mockSyncWeeklyClaimsMutation.isPending.value = false
    mockSyncWeeklyClaimsMutation.isError.value = false
    mockSyncWeeklyClaimsMutation.error.value = null
    mockSyncWeeklyClaimsMutation.data.value = null
    mockSyncWeeklyClaimsMutation.mutateAsync = mutateAsync
    return mutateAsync
  }

  const setEnableSuccess = () => {
    mockCashRemunerationWrites.enableClaim.mutate = vi.fn(
      async (_vars: unknown, opts?: { onSuccess?: () => Promise<void> | void }) => {
        await opts?.onSuccess?.()
      }
    )
  }

  const setEnableError = (error: unknown) => {
    mockCashRemunerationWrites.enableClaim.mutate = vi.fn(
      (_vars: unknown, opts?: { onError?: (e: unknown) => void }) => {
        opts?.onError?.(error)
      }
    )
  }

  const createWrapper = (isCashRemunerationOwner = true) =>
    mount(WeeklyClaimActionEnable, {
      props: {
        isCashRemunerationOwner,
        weeklyClaim
      }
    })

  beforeEach(() => {
    vi.clearAllMocks()
    mockTeamStore.currentTeamId = '1'
    mockTeamStore.getContractAddressByType.mockReturnValue(
      '0x6666666666666666666666666666666666666666'
    )
    mockCashRemunerationWrites.enableClaim.isPending.value = false
    setEnableSuccess()
  })

  it('does nothing on-chain when user is not contract owner', async () => {
    setupSyncMutation()
    const wrapper = createWrapper(false)

    await wrapper.find('[data-test="enable-action"]').trigger('click')
    await flushPromises()

    expect(mockCashRemunerationWrites.enableClaim.mutate).not.toHaveBeenCalled()
  })

  it('enables claim successfully and syncs backend state', async () => {
    const mutateAsync = setupSyncMutation(vi.fn().mockResolvedValue(undefined))

    const wrapper = createWrapper(true)
    await wrapper.find('[data-test="enable-action"]').trigger('click')
    await flushPromises()

    expect(mockCashRemunerationWrites.enableClaim.mutate).toHaveBeenCalledWith(
      { args: [keccak256('0x1234')] },
      expect.anything()
    )
    expect(mutateAsync).toHaveBeenCalledWith({ queryParams: { teamId: '1' } })

    const queryClient = useQueryClientFn.mock.results.at(-1)?.value
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['weekly-claims', '1']
    })

    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('shows sync error toast when mutation fails after successful tx', async () => {
    const mutateAsync = setupSyncMutation(vi.fn().mockRejectedValue(new Error('sync failed')))

    const wrapper = createWrapper(true)
    await wrapper.find('[data-test="enable-action"]').trigger('click')
    await flushPromises()
    const queryClient = useQueryClientFn.mock.results.at(-1)?.value

    expect(mutateAsync).toHaveBeenCalled()
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['weekly-claims', '1']
    })
  })

  it('handles enable mutation onError with user_rejected silently', async () => {
    vi.spyOn(utils, 'classifyError').mockReturnValue({
      category: 'user_rejected',
      userMessage: 'User rejected',
      raw: new Error('rejected')
    } as ReturnType<typeof utils.classifyError>)

    setupSyncMutation()
    setEnableError(new Error('rejected'))

    const wrapper = createWrapper(true)
    await wrapper.find('[data-test="enable-action"]').trigger('click')
    await flushPromises()

    expect(mockLog.error).toHaveBeenCalledWith('Enable error', expect.any(Error))
  })

  it('handles enable mutation onError with regular error', async () => {
    vi.spyOn(utils, 'classifyError').mockReturnValue({
      category: 'unknown',
      userMessage: 'Failure',
      raw: new Error('boom')
    } as ReturnType<typeof utils.classifyError>)

    setupSyncMutation()
    setEnableError(new Error('boom'))

    const wrapper = createWrapper(true)
    await wrapper.find('[data-test="enable-action"]').trigger('click')
    await flushPromises()

    expect(mockLog.error).toHaveBeenCalledWith('Enable error', expect.any(Error))
  })

  it('skips click while mutation is pending', async () => {
    setupSyncMutation()
    mockCashRemunerationWrites.enableClaim.isPending.value = true
    mockCashRemunerationWrites.enableClaim.mutate = vi.fn()

    const wrapper = createWrapper(true)
    await wrapper.find('[data-test="enable-action"]').trigger('click')
    await flushPromises()

    expect(mockCashRemunerationWrites.enableClaim.mutate).not.toHaveBeenCalled()
    mockCashRemunerationWrites.enableClaim.isPending.value = false
  })
})
