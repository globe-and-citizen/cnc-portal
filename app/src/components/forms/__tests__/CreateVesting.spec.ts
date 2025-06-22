import { describe, it, vi, expect, beforeEach } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import CreateVesting from '@/components/forms/CreateVesting.vue'
import { createTestingPinia } from '@pinia/testing'
import { ref } from 'vue'
import { type VestingRow } from '@/types/vesting'
const mockWriteContract = {
  writeContract: vi.fn(),
  error: ref(null),
  isPending: ref(false),
  data: ref(null)
}
const mockSymbol = ref<string>('shr')
const memberAddress = '0x000000000000000000000000000000000000dead'
const mockVestingInfos = ref<VestingRow[]>([
  {
    teamId: 1,
    member: memberAddress,
    startDate: new Date(Date.now() * 3600 * 1000).toLocaleDateString('en-GB'),
    durationDays: 30,
    cliffDays: 0,
    totalAmount: Number(BigInt(10e18)),
    released: Number(BigInt(2e18)),
    status: 'Active',
    tokenSymbol: mockSymbol.value,
    isStarted: true
  }
])
const mockWaitForReceipt = {
  isLoading: ref(false),
  isSuccess: ref(false)
}
const mockReadContract = {
  data: ref(BigInt('10000000000000000000')), // 10 tokens
  refetch: vi.fn(() => Promise.resolve()),
  error: ref(null)
}

vi.mock('@wagmi/vue', async (importOriginal) => {
  const actual = (await importOriginal()) as typeof import('@wagmi/vue')
  return {
    ...actual,
    useWriteContract: vi.fn(() => mockWriteContract),
    useWaitForTransactionReceipt: vi.fn(() => mockWaitForReceipt),
    useReadContract: vi.fn(() => mockReadContract)
  }
})

vi.mock('@/stores/useToastStore', () => ({
  useToastStore: () => ({
    addSuccessToast: vi.fn(),
    addErrorToast: vi.fn()
  })
}))

vi.mock('@/stores', () => ({
  useUserDataStore: () => ({
    address: '0x000000000000000000000000000000000000dead'
  })
}))

describe('CreateVesting.vue', () => {
  let wrapper: VueWrapper

  const mountComponent = () =>
    mount(CreateVesting, {
      props: {
        teamId: 1,
        tokenAddress: '0x000000000000000000000000000000000000beef',
        vestings: mockVestingInfos.value
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
    wrapper = mountComponent()
  })

  describe('Initial Render', () => {
    it('renders key form inputs', () => {
      expect(wrapper.find('[data-test="member"]').exists()).toBe(true)
      expect(wrapper.find('[data-test="start-date"]').exists()).toBe(true)
      expect(wrapper.find('[data-test="duration"]').exists()).toBe(true)
      expect(wrapper.find('[data-test="cliff"]').exists()).toBe(true)
      expect(wrapper.find('[data-test="total-amount"]').exists()).toBe(true)
    })

    it('shows error on invalid member address', async () => {
      await wrapper.find('[data-test="member"]').setValue('notanaddress')
      await wrapper.vm.$nextTick()
      expect(wrapper.text()).toContain('Please enter a valid Ethereum address.')
    })
  })

  describe('Allowance Approval', () => {
    it('calls approveAllowance when amount > 0', async () => {
      await wrapper.find('[data-test="total-amount"]').setValue(10)
      const approveBtn = wrapper.find('[data-test="approve-btn"]')
      expect(approveBtn.attributes('disabled')).toBeUndefined()
      await approveBtn.trigger('click')
      expect(mockWriteContract.writeContract).toHaveBeenCalled()
    })

    it.skip('disables approve button when amount is 0', async () => {
      await wrapper.find('[data-test="total-amount"]').setValue(0)
      await wrapper.vm.$nextTick()

      const approveBtn = wrapper.find('[data-test="approve-btn"]')
      console.log('===========the approveBtn', approveBtn.attributes('loading'))
      expect(approveBtn.attributes('disabled')).toBeDefined()
    })
  })

  describe('Create Vesting Submission', () => {
    beforeEach(async () => {
      await wrapper
        .find('[data-test="member"]')
        .setValue('0x000000000000000000000000000000000000dead')
      await wrapper.find('[data-test="start-date"]').setValue('2025-06-13')
      await wrapper.find('[data-test="duration"]').setValue(30)
      await wrapper.find('[data-test="cliff"]').setValue(5)
      await wrapper.find('[data-test="total-amount"]').setValue(5)
      await wrapper.setData({ tokenApproved: true })
      await wrapper.vm.$nextTick()
    })

    it('calls writeContract on valid form and tokenApproved=true', async () => {
      const submitBtn = wrapper.find('[data-test="submit-btn"]')
      expect(submitBtn.attributes('disabled')).toBeUndefined()
      await submitBtn.trigger('click')
      expect(mockWriteContract.writeContract).toHaveBeenCalled()
    })

    it.skip('disables submit button if tokenApproved is false', async () => {
      await wrapper.setData({ tokenApproved: false })
      await wrapper.vm.$nextTick()
      const submitBtn = wrapper.find('[data-test="submit-btn"]')
      expect(submitBtn.attributes('disabled')).toBeDefined()
    })
  })

  describe('Edge Cases', () => {
    it.skip('prevents submission if cliff > duration', async () => {
      await wrapper
        .find('[data-test="member"]')
        .setValue('0x000000000000000000000000000000000000dead')
      await wrapper.find('[data-test="start-date"]').setValue('2025-06-13')
      await wrapper.find('[data-test="duration"]').setValue(10)
      await wrapper.find('[data-test="cliff"]').setValue(20)
      await wrapper.find('[data-test="total-amount"]').setValue(5)
      await wrapper.setData({ tokenApproved: true })
      await wrapper.vm.$nextTick()

      const submitBtn = wrapper.find('[data-test="submit-btn"]')
      await submitBtn.trigger('click')
      expect(mockWriteContract.writeContract).not.toHaveBeenCalled()
    })
  })
})
