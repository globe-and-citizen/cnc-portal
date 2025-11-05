import { describe, it, vi, expect, beforeEach } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import Datepicker from '@vuepic/vue-datepicker'
import CreateVesting from '@/components/sections/VestingView/forms/CreateVesting.vue'
import SelectMemberInput from '@/components/utils/SelectMemberInput.vue'
import { createTestingPinia } from '@pinia/testing'
import { ref } from 'vue'
import { parseEther, parseUnits } from 'viem'
import { VESTING_ADDRESS } from '@/constant'
import { INVESTOR_ABI } from '@/artifacts/abi/investorsV1'
import { WagmiPlugin, createConfig, http } from '@wagmi/vue'
import { mainnet } from 'viem/chains'
import { mockUseCurrencyStore } from '@/tests/mocks/index.mock'
import { mockUseContractBalance } from '@/tests/mocks/useContractBalance.mock'

const wagmiConfig = createConfig({
  chains: [mainnet],
  transports: {
    [mainnet.id]: http()
  }
})

const memberAddress = '0x000000000000000000000000000000000000dead'
const mockSymbol = ref<string>('shr')
const mockReloadKey = ref<number>(0)
const mockCurrentTeam = ref({
  id: 1,
  ownerAddress: memberAddress,
  teamContracts: [
    {
      type: 'InvestorV1',
      address: '0x000000000000000000000000000000000000beef'
    }
  ]
})

const mockWriteContract = {
  writeContract: vi.fn(),
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

const mockWaitForReceipt = {
  isLoading: ref(false),
  isSuccess: ref(false)
}
const mockBalance = ref<bigint | undefined>(parseUnits('10', 6)) // default 10 tokens
const mockAllowance = ref(parseUnits('10', 6)) // default 10 tokens
const mockApproval = ref(parseUnits('10', 6)) // default 10 tokens
const mockBalanceError = ref<null | Error>(null)
const mockAllowanceError = ref<null | Error>(null)
const mockApprovalError = ref<null | Error>(null)

vi.mock('@wagmi/vue', async (importOriginal) => {
  const actual = (await importOriginal()) as typeof import('@wagmi/vue')
  return {
    ...actual,
    useWriteContract: vi.fn(() => mockWriteContract),
    useWaitForTransactionReceipt: vi.fn(() => mockWaitForReceipt),
    useReadContract: vi.fn(({ functionName }) => {
      if (functionName === 'balanceOf') {
        return {
          data: mockBalance,
          refetch: vi.fn(),
          error: mockBalanceError
        }
      }
      if (functionName === 'approve') {
        return {
          data: mockApproval,
          refetch: vi.fn(),
          error: mockApprovalError
        }
      }
      if (functionName === 'allowance') {
        return {
          data: mockAllowance,
          refetch: vi.fn(),
          error: mockAllowanceError
        }
      }

      if (functionName === 'getTeamVestingsWithMembers') {
        return {
          data: mockVestingInfos,
          error: ref(null),
          refetch: refetchVestingInfos
        }
      }
      if (functionName === 'symbol') {
        return {
          data: mockSymbol,
          error: ref(null),
          refetch: vi.fn()
        }
      }
      return {
        data: ref(BigInt(0)),
        refetch: vi.fn(),
        error: ref(null)
      }
    })
  }
})
vi.mock('@/stores/useToastStore')
vi.mock('@/stores', () => ({
  useUserDataStore: () => ({
    address: '0x000000000000000000000000000000000000dead'
  }),
  useTeamStore: () => ({
    currentTeam: mockCurrentTeam.value
  })
}))

vi.mock('@/stores/currencyStore', async (importOriginal) => {
  const original: object = await importOriginal()
  return {
    ...original,
    useCurrencyStore: vi.fn(() => ({ ...mockUseCurrencyStore() }))
  }
})
vi.mock('@/composables/useContractBalance', () => ({
  useContractBalance: vi.fn(() => mockUseContractBalance)
}))
describe('CreateVesting.vue', () => {
  let wrapper: VueWrapper
  const mountComponent = () =>
    mount(CreateVesting, {
      props: {
        reloadKey: mockReloadKey.value,
        tokenAddress: '0x000000000000000000000000000000000000beef'
      },
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn }), [WagmiPlugin, { config: wagmiConfig }]]
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
      selectMemberInput.setValue({
        name: 'Invalid',
        address: 'notanaddress'
      })

      await wrapper.vm.$nextTick()
      await wrapper.find('[data-test="submit-btn"]').trigger('click')
      await wrapper.vm.$nextTick()

      // Check for error message
      expect(wrapper.text()).toContain('Please enter a valid Ethereum address.')
    })
  })
  describe('Allowance Approval', () => {
    const fillValidForm = async (amount = 10) => {
      const selectMemberInput = wrapper.findComponent(SelectMemberInput)
      selectMemberInput.setValue({
        name: 'Test User',
        address: '0x120000000000000000000000000000000000dead'
      })
      await wrapper.find('[data-test="total-amount"]').setValue(amount)
      const datePicker = wrapper.findComponent(Datepicker)
      datePicker.setValue([new Date(), new Date()])
      await wrapper.find('[data-test="cliff"]').setValue(0)
    }

    it('calls approveAllowance when submitting with valid amount', async () => {
      await fillValidForm()

      const submitBtn = wrapper.find('[data-test="submit-btn"]')
      expect(submitBtn.attributes('disabled')).toBeUndefined()
      await submitBtn.trigger('click')
      await wrapper.vm.$nextTick()

      // Now in summary view, confirm vesting creation
      const confirmBtn = wrapper.find('[data-test="confirm-btn"]')
      await confirmBtn.trigger('click')

      // Verify approve token was called with correct arguments
      expect(mockWriteContract.writeContract).toHaveBeenCalledWith({
        address: '0x000000000000000000000000000000000000beef', // tokenAddress from props
        abi: INVESTOR_ABI,
        functionName: 'approve',
        args: [
          VESTING_ADDRESS,
          parseEther('10') // amount we set
        ]
      })
    })

    it('shows error when attempting to approve with zero amount', async () => {
      // Clear any previous calls from component mounting
      vi.clearAllMocks()

      await fillValidForm(0)

      const submitBtn = wrapper.find('[data-test="submit-btn"]')
      await submitBtn.trigger('click')

      // The form validation should prevent submission with zero amount
      // So no approval-related error toast should be called
      expect(mockWriteContract.writeContract).not.toHaveBeenCalled()
    })

    it('shows error on invalid cliff value', async () => {
      await fillValidForm(5)

      const cliffInput = wrapper.find('[data-test="cliff"]')
      await cliffInput.setValue(6)
      await wrapper.vm.$nextTick()

      await wrapper.find('[data-test="submit-btn"]').trigger('click')
      await wrapper.vm.$nextTick()

      expect(wrapper.text()).toContain('Cliff cannot be greater than duration.')
    })

    it('passes the correct totalAmountInUnits to writeContract', async () => {
      await fillValidForm(7)

      await wrapper.find('[data-test="submit-btn"]').trigger('click')
      await wrapper.vm.$nextTick()

      const confirmBtn = wrapper.find('[data-test="confirm-btn"]')
      await confirmBtn.trigger('click')
      await wrapper.vm.$nextTick()

      const callArgs = mockWriteContract.writeContract.mock.calls[0][0]
      const expectedAmount = parseUnits('7', 18)
      expect(callArgs.args[1]).toEqual(expectedAmount)
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
