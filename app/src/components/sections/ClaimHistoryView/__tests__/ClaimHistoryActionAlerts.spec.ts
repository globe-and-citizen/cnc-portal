import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { nextTick, ref } from 'vue'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import isoWeek from 'dayjs/plugin/isoWeek'
import ClaimHistoryActionAlerts from '@/components/sections/ClaimHistoryView/ClaimHistoryActionAlerts.vue'
import {
  mockToastStore,
  mockUserStore,
  mockWageData,
  mockWeeklyClaimData,
  queryMocks
} from '@/tests/mocks'
import { useGetTeamWagesQuery, useGetTeamWeeklyClaimsQuery } from '@/queries'

dayjs.extend(utc)
dayjs.extend(isoWeek)

describe('ClaimHistoryActionAlerts', () => {
  const baseAddress = '0x1234567890123456789012345678901234567890'

  const createWeeklyClaim = (overrides: Record<string, unknown> = {}) => {
    return {
      ...mockWeeklyClaimData[0],
      weekStart: '2024-01-01T00:00:00.000Z',
      signature: null,
      status: 'pending',
      claims: [{ ...mockWeeklyClaimData[0]?.claims[0], dayWorked: '2024-01-01T00:00:00.000Z' }],
      wage: {
        ...mockWeeklyClaimData[0]?.wage,
        userAddress: baseAddress
      },
      ...overrides
    }
  }

  const createWrapper = (props: Record<string, unknown> = {}) =>
    mount(ClaimHistoryActionAlerts, {
      props: {
        memberAddress: baseAddress,
        ...props
      },
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })],
        stubs: {
          SubmitClaims: {
            name: 'SubmitClaims',
            props: ['signedWeekStarts'],
            template: '<div data-test="submit-claims">{{ signedWeekStarts.length }}</div>'
          },
          CRSigne: {
            name: 'CRSigne',
            props: ['disabled'],
            template: '<div data-test="cr-signe">{{ disabled }}</div>'
          },
          CRWithdrawClaim: {
            name: 'CRWithdrawClaim',
            props: ['disabled'],
            template: '<div data-test="cr-withdraw">{{ disabled }}</div>'
          },
          IconifyIcon: {
            name: 'IconifyIcon',
            template: '<span data-test="icon" />'
          }
        }
      }
    })

  beforeEach(() => {
    vi.clearAllMocks()
    mockUserStore.address = baseAddress
  })

  it('renders submit claim alert with SubmitClaims when user has wage', () => {
    const wrapper = createWrapper({ weeklyClaim: createWeeklyClaim() })

    expect(wrapper.find('[data-test="action-alerts"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('You have a wage so you can submit your claim')
    expect(wrapper.find('[data-test="submit-claims"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="submit-claim-disabled-button"]').exists()).toBe(false)
  })

  it('renders disabled submit button when user has no wage', () => {
    ;(
      useGetTeamWagesQuery as unknown as { mockReturnValueOnce: (value: unknown) => void }
    ).mockReturnValueOnce({
      data: ref([
        { ...mockWageData[0], userAddress: '0x9999999999999999999999999999999999999999' }
      ]),
      error: ref(null)
    })

    const wrapper = createWrapper({ weeklyClaim: createWeeklyClaim() })

    expect(wrapper.text()).toContain('You need to have a wage set up to submit claims')
    expect(wrapper.find('[data-test="submit-claim-disabled-button"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="submit-claims"]').exists()).toBe(false)
  })

  it('renders already-submitted message when claim status is not pending', () => {
    const wrapper = createWrapper({
      weeklyClaim: createWeeklyClaim({ status: 'signed' })
    })

    expect(wrapper.text()).toContain(
      'This week claim is already signed, you cannot submit new claims'
    )
  })

  it('passes signedWeekStarts to SubmitClaims from signed claims and signatures', () => {
    ;(
      useGetTeamWeeklyClaimsQuery as unknown as { mockReturnValueOnce: (value: unknown) => void }
    ).mockReturnValueOnce({
      data: ref([
        { ...createWeeklyClaim({ status: 'signed', weekStart: '2024-01-08T00:00:00.000Z' }) },
        {
          ...createWeeklyClaim({
            status: 'pending',
            signature: '0xabc',
            weekStart: '2024-01-15T00:00:00.000Z'
          })
        },
        {
          ...createWeeklyClaim({
            status: 'pending',
            signature: null,
            weekStart: '2024-01-22T00:00:00.000Z'
          })
        }
      ])
    })

    const wrapper = createWrapper({ weeklyClaim: createWeeklyClaim() })
    const vm = wrapper.vm as unknown as { signedWeekStarts: string[] }

    expect(wrapper.find('[data-test="submit-claims"]').text()).toBe('2')
    expect(vm.signedWeekStarts).toEqual(['2024-01-08T00:00:00.000Z', '2024-01-15T00:00:00.000Z'])
  })

  it('falls back to empty signedWeekStarts when weekly claims data is undefined', () => {
    ;(
      useGetTeamWeeklyClaimsQuery as unknown as { mockReturnValueOnce: (value: unknown) => void }
    ).mockReturnValueOnce({
      data: ref(undefined)
    })

    const wrapper = createWrapper({ weeklyClaim: createWeeklyClaim() })

    expect(wrapper.find('[data-test="submit-claims"]').text()).toBe('0')
  })

  it('shows approve alert and disables CRSigne for current and next week', () => {
    const currentWeekStart = dayjs().utc().startOf('isoWeek').toISOString()
    const nextWeekStart = dayjs().utc().add(1, 'week').startOf('isoWeek').toISOString()

    const currentWeekWrapper = createWrapper({
      weeklyClaim: createWeeklyClaim({ weekStart: currentWeekStart })
    })
    expect(currentWeekWrapper.text()).toContain(
      'You cannot approve the current week claim, wait until the week is over'
    )
    expect(currentWeekWrapper.find('[data-test="cr-signe"]').text()).toContain('true')

    const nextWeekWrapper = createWrapper({
      weeklyClaim: createWeeklyClaim({ weekStart: nextWeekStart })
    })
    expect(nextWeekWrapper.text()).toContain(
      'You cannot approve the next week claim, wait until the week is over'
    )
    expect(nextWeekWrapper.find('[data-test="cr-signe"]').text()).toContain('true')
  })

  it('shows owner approve message and enabled CRSigne for older week', () => {
    const wrapper = createWrapper({
      weeklyClaim: createWeeklyClaim({ weekStart: '2023-12-25T00:00:00.000Z' })
    })

    expect(wrapper.text()).toContain(
      'As the owner of the Cash Remuneration contract, you can approve this claim'
    )
    expect(wrapper.find('[data-test="cr-signe"]').text()).toContain('false')
  })

  it('hides CRSigne when weekly claim has no claim lines', () => {
    const wrapper = createWrapper({
      weeklyClaim: createWeeklyClaim({ claims: [] })
    })

    expect(wrapper.find('[data-test="cr-signe"]').exists()).toBe(false)
  })

  it('does not render approve alert when claim already signed on-chain', () => {
    const wrapper = createWrapper({
      weeklyClaim: createWeeklyClaim({ signature: '0xsigned' })
    })

    expect(wrapper.text()).not.toContain('As the owner of the Cash Remuneration contract')
    expect(wrapper.find('[data-test="cr-signe"]').exists()).toBe(false)
  })

  it('renders withdraw alert branches for signed and withdrawn statuses', () => {
    const signedWrapper = createWrapper({
      weeklyClaim: createWeeklyClaim({ status: 'signed' })
    })
    expect(signedWrapper.text()).toContain(
      'Your weekly claim has been approved. You can now withdraw it.'
    )
    expect(signedWrapper.find('[data-test="cr-withdraw"]').text()).toContain('false')

    const withdrawnWrapper = createWrapper({
      weeklyClaim: createWeeklyClaim({ status: 'withdrawn' })
    })
    expect(withdrawnWrapper.text()).toContain('You have withdrawn your weekly claim.')
    expect(withdrawnWrapper.find('[data-test="cr-withdraw"]').text()).toContain('true')
  })

  it('hides withdraw alert when connected user is not wage owner', () => {
    mockUserStore.address = '0x2222222222222222222222222222222222222222'

    const wrapper = createWrapper({
      weeklyClaim: createWeeklyClaim({ status: 'signed' })
    })

    expect(wrapper.find('[data-test="cr-withdraw"]').exists()).toBe(false)
  })

  it('hides CRWithdrawClaim action when signed/withdrawn claim has no claim lines', () => {
    const wrapper = createWrapper({
      weeklyClaim: createWeeklyClaim({ status: 'signed', claims: [] })
    })

    expect(wrapper.find('[data-test="cr-withdraw"]').exists()).toBe(false)
  })

  it('triggers toast when team wages query emits an error', async () => {
    const wageError = ref<Error | null>(null)
    ;(
      useGetTeamWagesQuery as unknown as { mockReturnValueOnce: (value: unknown) => void }
    ).mockReturnValueOnce({
      ...(queryMocks.useGetTeamWagesQuery?.() ?? {}),
      error: wageError
    })

    createWrapper({ weeklyClaim: createWeeklyClaim() })
    wageError.value = new Error('boom')
    await nextTick()
    wageError.value = null
    await nextTick()

    expect(mockToastStore.addErrorToast).toHaveBeenCalledWith('Failed to fetch user wage data')
    expect(mockToastStore.addErrorToast).toHaveBeenCalledTimes(1)
  })

  it('evaluates queryParams computed values for wages and weekly claims hooks', () => {
    createWrapper({ weeklyClaim: createWeeklyClaim() })

    const wagesSpy = useGetTeamWagesQuery as unknown as {
      mock: { calls: Array<Array<{ queryParams: { teamId: { value: string } } }>> }
    }
    const weeklyClaimsSpy = useGetTeamWeeklyClaimsQuery as unknown as {
      mock: {
        calls: Array<
          Array<{ queryParams: { teamId: { value: string }; userAddress: { value: string } } }>
        >
      }
    }

    expect(wagesSpy.mock.calls[0]?.[0]?.queryParams?.teamId?.value).toBeTruthy()
    expect(weeklyClaimsSpy.mock.calls[0]?.[0]?.queryParams?.teamId?.value).toBeTruthy()
    expect(weeklyClaimsSpy.mock.calls[0]?.[0]?.queryParams?.userAddress?.value).toBe(baseAddress)
  })

  it('hides all alerts when not own member view and no weekly claim', () => {
    const wrapper = createWrapper({
      memberAddress: '0x8888888888888888888888888888888888888888',
      weeklyClaim: undefined
    })

    expect(wrapper.findAll('[role="alert"]').length).toBe(0)
    expect(wrapper.text()).not.toContain('Submit Claim')
  })
})
