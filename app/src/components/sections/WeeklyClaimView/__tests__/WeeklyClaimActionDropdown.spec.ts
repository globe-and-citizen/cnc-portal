import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { keccak256 } from 'viem'
import DropdownActions from '../WeeklyClaimActionDropdown.vue'
import type { Status } from '../WeeklyClaimActionDropdown.vue'
import type { WeeklyClaim } from '@/types'
import {
  mockCashRemunerationWrites,
  mockSyncWeeklyClaimsMutation,
  mockTeamStore,
  mockUserStore,
  mockUseReadContract,
  useQueryClientFn
} from '@/tests/mocks'

vi.mock('@/composables/cashRemuneration/writes', () => ({
  useEnableClaim: vi.fn(() => mockCashRemunerationWrites.enableClaim),
  useDisableClaim: vi.fn(() => mockCashRemunerationWrites.disableClaim)
}))

describe('WeeklyClaimActionDropdown', () => {
  const weeklyClaim: WeeklyClaim = {
    id: 1,
    status: 'pending',
    hoursWorked: 480,
    createdAt: '2024-01-01T00:00:00Z',
    wage: {
      userAddress: '0xOwner',
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
    data: { ownerAddress: '0xOwner' },
    memberAddress: '0xMember',
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

  const setDisableSuccess = () => {
    mockCashRemunerationWrites.disableClaim.mutate = vi.fn(
      async (_vars: unknown, opts?: { onSuccess?: () => Promise<void> | void }) => {
        await opts?.onSuccess?.()
      }
    )
  }

  const createWrapper = (status: Status = 'pending') => {
    return mount(DropdownActions, {
      props: {
        status,
        weeklyClaim
      },
      global: {
        stubs: {
          CRWithdrawClaim: {
            name: 'CRWithdrawClaim',
            template:
              '<button data-test="withdraw-action" @click="$emit(\'claim-withdrawn\')">Withdraw</button>'
          },
          CRSigne: {
            name: 'CRSigne',
            props: ['isResign'],
            template:
              '<button data-test="sign-action" @click="$emit(\'close\')">{{ isResign ? "Resign" : "Sign" }}</button>'
          },
          WeeklyClaimActionEnable: {
            name: 'WeeklyClaimActionEnable',
            template: '<button data-test="enable-action" @click="$emit(\'close\')">Enable</button>'
          }
        }
      }
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()

    mockTeamStore.currentTeamId = '1'
    mockTeamStore.getContractAddressByType.mockReturnValue(
      '0x6666666666666666666666666666666666666666'
    )

    mockUserStore.address = '0xOwner'
    mockUseReadContract.data.value = '0xOwner'

    mockCashRemunerationWrites.disableClaim.isPending.value = false
    setDisableSuccess()

    setupSyncMutation()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('does not render dropdown actions for withdrawn status', () => {
    const wrapper = createWrapper('withdrawn')
    expect(wrapper.find('button').exists()).toBe(false)
    expect(wrapper.find('ul').exists()).toBe(false)
  })

  it('opens and closes menu when clicking trigger button', async () => {
    const wrapper = createWrapper('pending')
    const trigger = wrapper.find('button')

    expect(wrapper.find('ul').exists()).toBe(false)

    await trigger.trigger('click')
    expect(wrapper.find('ul').exists()).toBe(true)

    await trigger.trigger('click')
    expect(wrapper.find('ul').exists()).toBe(false)
  })

  it('renders pending actions and closes when sign child emits close', async () => {
    const wrapper = createWrapper('pending')

    await wrapper.find('button').trigger('click')
    expect(wrapper.find('[data-test="pending-withdraw"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="pending-sign"]').exists()).toBe(true)

    await wrapper.find('[data-test="sign-action"]').trigger('click')
    expect(wrapper.find('ul').exists()).toBe(false)
  })

  it('renders disabled actions and closes when enable child emits close', async () => {
    const wrapper = createWrapper('disabled')

    await wrapper.find('button').trigger('click')
    expect(wrapper.find('[data-test="disabled-withdraw"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="disabled-enable"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="disabled-resign"]').exists()).toBe(true)

    await wrapper.find('[data-test="enable-action"]').trigger('click')
    expect(wrapper.find('ul').exists()).toBe(false)
  })

  it('does not call disable flow when current user is not remuneration owner', async () => {
    mockUserStore.address = '0xNotOwner'
    mockUseReadContract.data.value = '0xOwner'

    const wrapper = createWrapper('signed')
    await wrapper.find('button').trigger('click')

    const disableLink = wrapper.find('[data-test="signed-disable"] a')
    await disableLink.trigger('click')
    await flushPromises()

    expect(mockCashRemunerationWrites.disableClaim.mutate).not.toHaveBeenCalled()
  })

  it('disables claim successfully and syncs weekly claims', async () => {
    const mutateAsync = setupSyncMutation(vi.fn().mockResolvedValue(undefined))

    const wrapper = createWrapper('signed')
    await wrapper.find('button').trigger('click')

    const disableLink = wrapper.find('[data-test="signed-disable"] a')
    await disableLink.trigger('click')
    await flushPromises()

    expect(mockCashRemunerationWrites.disableClaim.mutate).toHaveBeenCalledWith(
      { args: [keccak256('0x1234')] },
      expect.anything()
    )
    expect(mutateAsync).toHaveBeenCalledWith({ queryParams: { teamId: '1' } })

    const queryClient = useQueryClientFn.mock.results.at(-1)?.value
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['weekly-claims', '1']
    })

    expect(wrapper.find('ul').exists()).toBe(false)
  })

  it('removes document click listener on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener')

    const wrapper = createWrapper('pending')
    vi.runAllTimers()
    wrapper.unmount()

    expect(removeEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function))
  })
})
