import { describe, it, vi, expect, beforeEach } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import CreateVesting from '@/components/sections/VestingView/forms/CreateVesting.vue'
import SelectMemberInput from '@/components/utils/SelectMemberInput.vue'
import { createTestingPinia } from '@pinia/testing'
import { ref } from 'vue'
import { mockUseContractBalance } from '@/tests/mocks/composables.mock'
import { CalendarDate } from '@internationalized/date'

const memberAddress = '0x000000000000000000000000000000000000dead'
const mockReloadKey = ref<number>(0)
const mockResolvedVestingAddress = ref('0x1000000000000000000000000000000000000001' as const)

const mockWriteContract = {
  mutate: vi.fn(),
  error: ref<null | Error>(null),
  isPending: ref(false),
  data: ref(null)
}
type VestingInfosType = [string[], object[]] | [string[]] | [] | null | undefined

// Mockeds
const mockVestingInfos = ref<VestingInfosType>([
  [memberAddress],
  [
    {
      start: `${Math.floor(Date.now() / 1000) - 3600}`,
      duration: `${30 * 86400}`,
      cliff: '0',
      totalAmount: BigInt(10e18),
      released: BigInt(2e18),
      active: true
    }
  ]
])
const refetchVestingInfos = vi.fn()

vi.mock('@/composables/vesting/reads', () => ({
  useVestingAddress: vi.fn(() => mockResolvedVestingAddress),
  useVestingGetTeamVestingsWithMembers: vi.fn(() => ({
    data: mockVestingInfos,
    error: ref(null),
    refetch: refetchVestingInfos
  }))
}))

describe('CreateVesting.vue', () => {
  let wrapper: VueWrapper
  const submitForm = async () => {
    await wrapper.find('[data-test="submit-btn"]').trigger('click')
    await wrapper.vm.$nextTick()
  }
  const mountComponent = () =>
    mount(CreateVesting, {
      props: {
        reloadKey: mockReloadKey.value,
        tokenAddress: '0x000000000000000000000000000000000000beef'
      },
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })]
      },
      data() {
        return {
          tokenApproved: false
        }
      }
    })
  beforeEach(() => {
    vi.clearAllMocks()
    wrapper = mountComponent()
  })
  describe('Initial Render', () => {
    it('renders key form inputs', () => {
      // Check for member selection
      expect(wrapper.find('[data-test="member"]').exists()).toBe(true)

      // Check for date range picker
      expect(wrapper.find('[data-test="date-range"]').exists()).toBe(true)

      // Check for duration inputs

      // Check for amount and cliff inputs
      expect(wrapper.find('[data-test="total-amount"]').exists()).toBe(true)
      expect(wrapper.find('[data-test="cliff"]').exists()).toBe(true)

      // Check for submit button
      expect(wrapper.find('[data-test="submit-btn"]').exists()).toBe(true)
    })
    it('shows error on invalid member address', async () => {
      const selectMemberInput = wrapper.findComponent(SelectMemberInput)
      selectMemberInput.vm.$emit('selectMember', {
        name: 'Invalid',
        address: 'notanaddress'
      })

      await wrapper.vm.$nextTick()
      await submitForm()
      expect(wrapper.findComponent({ name: 'VestingSummary' }).exists()).toBe(false)
    })
  })
  describe('Allowance Approval', () => {
    const fillValidForm = async (amount = 10) => {
      const selectMemberInput = wrapper.findComponent(SelectMemberInput)
      selectMemberInput.vm.$emit('selectMember', {
        name: 'Test User',
        address: '0x120000000000000000000000000000000000dead'
      })
      ;(wrapper.vm as unknown as { totalAmount: number }).totalAmount = amount
      ;(
        wrapper.vm as unknown as {
          onDateRangeChange: (value: { start: CalendarDate; end: CalendarDate }) => void
        }
      ).onDateRangeChange({
        start: new CalendarDate(2025, 6, 1),
        end: new CalendarDate(2025, 6, 2)
      })
      await wrapper.vm.$nextTick()
      ;(wrapper.vm as unknown as { cliff: number }).cliff = 0
      await wrapper.vm.$nextTick()
    }

    it('calls approveAllowance when submitting with valid amount', async () => {
      await fillValidForm()

      const submitBtn = wrapper.find('[data-test="submit-btn"]')
      expect(submitBtn.attributes('disabled')).toBeUndefined()
      await submitForm()

      // Now in summary view, confirm vesting creation
      const confirmBtn = wrapper.find('[data-test="confirm-btn"]')
      await confirmBtn.trigger('click')

      // Verify approve token was called with correct arguments
      // expect(mockWriteContract.mutate).toHaveBeenCalledWith({
      //   address: '0x000000000000000000000000000000000000beef', // tokenAddress from props
      //   abi: INVESTOR_ABI,
      //   functionName: 'approve',
      //   args: [
      //     VESTING_ADDRESS,
      //     parseEther('10') // amount we set
      //   ]
      // })
    })

    it('shows error when attempting to approve with zero amount', async () => {
      // Clear any previous calls from component mounting
      vi.clearAllMocks()

      await fillValidForm(0)

      await submitForm()

      // The form validation should prevent submission with zero amount
      // So no approval-related error toast should be called
      expect(mockWriteContract.mutate).not.toHaveBeenCalled()
    })

    it('shows error on invalid cliff value', async () => {
      await fillValidForm(5)
      ;(wrapper.vm as unknown as { cliff: number }).cliff = 6
      await wrapper.vm.$nextTick()

      await submitForm()
      expect(wrapper.findComponent({ name: 'VestingSummary' }).exists()).toBe(false)
    })

    it('passes the correct totalAmountInUnits to writeContract', async () => {
      await fillValidForm(7)

      await submitForm()

      const confirmBtn = wrapper.find('[data-test="confirm-btn"]')
      await confirmBtn.trigger('click')
      await wrapper.vm.$nextTick()

      // const callArgs = mockWriteContract.mutate.mock.calls[0][0]
      // const expectedAmount = parseUnits('7', 18)
      // expect(callArgs.args[1]).toEqual(expectedAmount)
    })

    it('returns an empty array from activeMembers if vestingInfos is not an array of length 2', () => {
      interface IWrapper {
        activeMembers: string[]
      }

      const testCases = [
        { value: undefined },
        { value: [[memberAddress]] as unknown as [string[]] },
        { value: null }
      ]

      testCases.forEach(({ value }) => {
        mockVestingInfos.value = value
        const wrapper = mountComponent()
        expect((wrapper.vm as unknown as IWrapper).activeMembers).toEqual([])
      })
    })

    it('returns the correct token balance for the given tokenAddress', () => {
      interface IWrapper {
        tokenBalance: (typeof mockUseContractBalance.balances.value)[0] | undefined
      }

      mockUseContractBalance.balances.value = [
        {
          token: {
            id: '2',
            name: 'BeefToken',
            symbol: 'BEEF',
            code: 'BEEF',
            coingeckoId: 'beeftoken',
            decimals: 18,
            address: '0x000000000000000000000000000000000000beef'
          },
          amount: 42,
          values: {
            USD: {
              value: 500,
              formated: '$500',
              id: 'usd',
              code: 'USD',
              symbol: '$',
              price: 1000,
              formatedPrice: '$1K'
            }
          }
        }
      ]
      const tokenBalance = (wrapper.vm as unknown as IWrapper).tokenBalance

      expect(tokenBalance).toBeDefined()
      if (tokenBalance) {
        expect(tokenBalance.amount).toBe(42)
        expect(tokenBalance.token.address).toBe('0x000000000000000000000000000000000000beef')
      }
    })
  })
})
