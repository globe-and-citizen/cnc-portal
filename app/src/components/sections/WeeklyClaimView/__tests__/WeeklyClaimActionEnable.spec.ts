import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import WeeklyClaimActionEnable from '../WeeklyClaimActionEnable.vue'
import type { WeeklyClaim } from '@/types'
import {
  mockSyncWeeklyClaimsMutation,
  mockTeamStore,
  mockWagmiCore,
  useQueryClientFn
} from '@/tests/mocks'
import { log } from '@/utils'

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

    mockWagmiCore.simulateContract.mockResolvedValue({})
    mockWagmiCore.writeContract.mockResolvedValue('0xhash')
    mockWagmiCore.waitForTransactionReceipt.mockResolvedValue({ status: 'success' })
  })

  it('does nothing on-chain when user is not contract owner', async () => {
    setupSyncMutation()
    const wrapper = createWrapper(false)

    await wrapper.find('[data-test="enable-action"]').trigger('click')

    expect(mockWagmiCore.simulateContract).not.toHaveBeenCalled()
    expect(mockWagmiCore.writeContract).not.toHaveBeenCalled()
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('shows an error toast when contract address is missing', async () => {
    setupSyncMutation()
    mockTeamStore.getContractAddressByType.mockReturnValueOnce(undefined)

    const wrapper = createWrapper(true)
    await wrapper.find('[data-test="enable-action"]').trigger('click')

    expect(mockWagmiCore.simulateContract).not.toHaveBeenCalled()
    expect(mockWagmiCore.writeContract).not.toHaveBeenCalled()
    expect(wrapper.emitted('loading')).toEqual([[true], [false]])
  })

  it('enables claim successfully and syncs backend state', async () => {
    const mutateAsync = setupSyncMutation(vi.fn().mockResolvedValue(undefined))

    const wrapper = createWrapper(true)
    await wrapper.find('[data-test="enable-action"]').trigger('click')
    await flushPromises()

    expect(mockWagmiCore.simulateContract).toHaveBeenCalled()
    expect(mockWagmiCore.writeContract).toHaveBeenCalled()
    expect(mockWagmiCore.waitForTransactionReceipt).toHaveBeenCalled()
    expect(mutateAsync).toHaveBeenCalledWith({ queryParams: { teamId: '1' } })

    const queryClient = useQueryClientFn.mock.results.at(-1)?.value
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['weekly-claims', '1']
    })

    expect(wrapper.emitted('loading')).toEqual([[true], [false]])
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

  it('shows tx failure toast on reverted receipt', async () => {
    setupSyncMutation()
    mockWagmiCore.waitForTransactionReceipt.mockResolvedValueOnce({ status: 'reverted' })

    const wrapper = createWrapper(true)
    await wrapper.find('[data-test="enable-action"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-test="enable-action"]').attributes('aria-disabled')).toBe('true')
  })

  it('logs and shows parsed error when simulation throws', async () => {
    setupSyncMutation()
    const simulateError = new Error('simulate failed')
    mockWagmiCore.simulateContract.mockRejectedValueOnce(simulateError)

    const wrapper = createWrapper(true)
    await wrapper.find('[data-test="enable-action"]').trigger('click')
    await flushPromises()

    expect(log.error).toHaveBeenCalledWith('Enable error', simulateError)
    expect(wrapper.emitted('loading')).toEqual([[true], [false]])
  })
})
