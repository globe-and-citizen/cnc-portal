import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import DropdownActions from '../WeeklyClaimActionDropdown.vue'
import type { Status } from '../WeeklyClaimActionDropdown.vue'
import { createPinia, setActivePinia } from 'pinia'
import type { WeeklyClaim } from '@/types'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import isoWeek from 'dayjs/plugin/isoWeek'
import { mockUserStore, mockWagmiCore } from '@/tests/mocks'

// Configure dayjs plugins
dayjs.extend(utc)
dayjs.extend(isoWeek)

vi.mock('@iconify/vue', () => ({
  Icon: {
    template: '<span>Icon</span>'
  }
}))

describe('DropdownActions', () => {
  const MOCK_OWNER_ADDRESS = '0xOwnerAddress'

  const weeklyClaim: WeeklyClaim = {
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

  const createWrapper = (status: Status = 'pending') => {
    return mount(DropdownActions, {
      props: {
        status,
        weeklyClaim
      },
      global: {
        stubs: {
          IconifyIcon: true,
          ButtonUI: true,
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
    setActivePinia(createPinia())
    vi.useFakeTimers()
    mockUserStore.address = '0xContractOwner'
    mockWagmiCore.simulateContract.mockResolvedValue({})
    mockWagmiCore.writeContract.mockResolvedValue('0xhash')
    mockWagmiCore.waitForTransactionReceipt.mockResolvedValue({ status: 'success' })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('renders Enable and Resign actions for disabled status', async () => {
    const wrapper = createWrapper('disabled')
    const button = wrapper.findComponent({ name: 'ButtonUI' })
    button.trigger('click')

    await flushPromises()

    expect(wrapper.text()).toContain('Withdraw')
    const disabledWithdraw = wrapper.find('[data-test="disabled-withdraw"]')
    expect(disabledWithdraw.exists()).toBeTruthy()
    expect(disabledWithdraw.classes()).toContain('disabled')
    const disabledResign = wrapper.find('[data-test="disabled-resign"]')
    expect(disabledResign.exists()).toBeTruthy()
    expect(disabledResign.classes()).toContain('disabled')
    const disabledEnable = wrapper.find('[data-test="disabled-enable"]')
    expect(disabledEnable.exists()).toBeTruthy()
    expect(disabledEnable.classes()).toContain('disabled')
    expect(wrapper.text()).not.toContain('Sign')
  })

  it('closes dropdown after action is selected', async () => {
    const wrapper = createWrapper('pending')
    const button = wrapper.findComponent({ name: 'ButtonUI' })

    // Open dropdown
    await button.trigger('click')
    //@ts-expect-error not visible wrapper
    expect(wrapper.vm.isOpen).toBe(true)
    // Click action
    // const signAction = wrapper.find('[data-test="sign-action"]')
    const crSign = wrapper.findComponent({ name: 'CRSigne' })
    expect(crSign.exists()).toBeTruthy()
    const signAction = crSign.find('[data-test="sign-action"]')
    expect(signAction.exists()).toBeTruthy()
    await signAction.trigger('click')

    // Check dropdown is closed
    //@ts-expect-error not visible wrapper
    expect(wrapper.vm.isOpen).toBe(false)
    expect(wrapper.find('ul').exists()).toBe(false)
  })

  it('closes dropdown after withdraw action', async () => {
    const wrapper = createWrapper('signed')
    const button = wrapper.findComponent({ name: 'ButtonUI' })

    await button.trigger('click')

    const crWithdrawClaim = wrapper.findComponent({ name: 'CRWithdrawClaim' })
    const withdrawAction = crWithdrawClaim.find('[data-test="withdraw-action"]')
    expect(withdrawAction.exists()).toBeTruthy()

    // Test Withdraw action
    await withdrawAction.trigger('click')
    expect(crWithdrawClaim.emitted()).toHaveProperty('claim-withdrawn')
    //@ts-expect-error not visible on wrapper
    expect(wrapper.vm.isOpen).toBeFalsy()
  })

  it('closes dropdown when clicking outside', async () => {
    const wrapper = createWrapper('pending')
    const button = wrapper.findComponent({ name: 'ButtonUI' })

    // Open dropdown
    await button.trigger('click')
    //@ts-expect-error not visible wrapper
    expect(wrapper.vm.isOpen).toBe(true)

    // Advance timers to ensure event listener is set up
    vi.runAllTimers()

    // Simulate click outside
    document.dispatchEvent(new MouseEvent('click'))

    // Check dropdown is closed
    //@ts-expect-error not visible wrapper
    expect(wrapper.vm.isOpen).toBe(false)
  })

  it('removes event listener on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener')

    const wrapper = createWrapper('pending')
    wrapper.unmount()

    expect(removeEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function))
  })

  describe('Disabled status', () => {
    it('closes dropdown after enable action', async () => {
      const wrapper = createWrapper('disabled')
      const button = wrapper.findComponent({ name: 'ButtonUI' })
      await button.trigger('click')

      const enableComponent = wrapper.findComponent({ name: 'WeeklyClaimActionEnable' })
      const enableAction = enableComponent.find('[data-test="enable-action"]')
      expect(enableAction.exists()).toBeTruthy()

      await enableAction.trigger('click')
      expect(enableComponent.emitted()).toHaveProperty('close')
      //@ts-expect-error not visible on wrapper
      expect(wrapper.vm.isOpen).toBeFalsy()
    })
  })

  describe.skip('Signed status', () => {
    it('calls disableClaim and closes dropdown on Disable action', async () => {
      //@ts-expect-error only mocking necessary fields
      vi.mocked(useUserDataStore).mockReturnValue({
        address: '0xContractOwner'
      })

      const wrapper = createWrapper('signed')
      const button = wrapper.findComponent({ name: 'ButtonUI' })
      await button.trigger('click')

      const signedDisable = wrapper.find('[data-test="signed-disable"]')
      const disableLink = signedDisable.find('a')

      await disableLink.trigger('click')
      await flushPromises()
      await wrapper.vm.$nextTick()

      //@ts-expect-error not visible on wrapper
      expect(wrapper.vm.isOpen).toBeFalsy()
    })
  })
})
