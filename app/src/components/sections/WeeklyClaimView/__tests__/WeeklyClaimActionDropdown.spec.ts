import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import DropdownActions from '../WeeklyClaimActionDropdown.vue'
import type { Status } from '../WeeklyClaimActionDropdown.vue'
import { createPinia, setActivePinia } from 'pinia'
import { useUserDataStore } from '@/stores'
import type { WeeklyClaim } from '@/types'
import { ref } from 'vue'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import isoWeek from 'dayjs/plugin/isoWeek'

// Configure dayjs plugins
dayjs.extend(utc)
dayjs.extend(isoWeek)

// Mock the dependencies
vi.mock('viem', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    keccak256: vi.fn()
  }
})
vi.mock('@iconify/vue', () => ({
  Icon: {
    template: '<span>Icon</span>'
  }
}))

vi.mock('@/components/ButtonUI.vue', () => ({
  default: {
    template: '<button><slot /></button>',
    props: ['size', 'class']
  }
}))

vi.mock('@/utils', () => ({
  log: {
    error: vi.fn()
  },
  parseError: vi.fn(() => 'Parsed error message')
}))

vi.mock('@/composables', () => ({
  useCustomFetch: vi.fn(() => ({
    put: () => ({
      json: () => ({
        execute: vi.fn().mockResolvedValue({}),
        error: ref(null)
      })
    }),
    post: () => ({
      json: () => ({
        execute: vi.fn().mockResolvedValue({}),
        error: ref(null)
      })
    })
  }))
}))

vi.mock('@tanstack/vue-query', () => ({
  useQueryClient: () => ({
    invalidateQueries: vi.fn()
  })
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
          ButtonUI: true
        }
      }
    })
  }

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
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
    //@ts-expect-error only mocking necessary fields
    vi.mocked(useUserDataStore).mockReturnValue({
      address: '0xContractOwner'
    })
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
    //@ts-expect-error only mocking necessary fileds
    vi.mocked(useUserDataStore).mockReturnValue({
      address: '0xContractOwner'
    })
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
})
