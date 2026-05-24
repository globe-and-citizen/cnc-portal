import { describe, it, vi, expect, beforeEach } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { ref } from 'vue'
import CreateVesting from '@/components/sections/VestingView/forms/CreateVesting.vue'
import { mockERC20Reads, mockERC20Writes } from '@/tests/mocks/erc20.mock'
import { mockVestingWrites } from '@/tests/mocks/contract.mock'

const mockReloadKey = ref<number>(0)
const mockResolvedVestingAddress = ref('0x1000000000000000000000000000000000000001' as const)

type VestingInfosType = [string[], object[]] | [string[]] | [] | null | undefined
const mockVestingInfos = ref<VestingInfosType>([[], []])

vi.mock('@/composables/vesting/reads', () => ({
  useVestingAddress: vi.fn(() => mockResolvedVestingAddress),
  useVestingGetTeamVestingsWithMembers: vi.fn(() => ({
    data: mockVestingInfos,
    error: ref(null),
    refetch: vi.fn()
  }))
}))

const mountComponent = () =>
  mount(CreateVesting, {
    props: {
      reloadKey: mockReloadKey.value,
      tokenAddress: '0x000000000000000000000000000000000000beef'
    },
    global: {
      plugins: [createTestingPinia({ createSpy: vi.fn })]
    }
  })

type ApproveOpts = { onSuccess?: () => void; onError?: (e: Error) => void }
type Vm = {
  member: { name: string; address: string }
  totalAmount: number
  errorMessage: string
  approveAllowance: () => Promise<void>
  submit: () => Promise<void>
}

describe('CreateVesting.vue — submission error branches', () => {
  let wrapper: VueWrapper

  beforeEach(() => {
    vi.clearAllMocks()
    mockVestingInfos.value = [[], []]
    mockResolvedVestingAddress.value = '0x1000000000000000000000000000000000000001'
    mockERC20Reads.balanceOf.data.value = 1000n * 10n ** 18n
    mockERC20Reads.allowance.data.value = 1000000n * 10n ** 18n
  })

  const drive = async (opts: {
    vestingAddress?: `0x${string}`
    balance?: bigint
    allowance?: bigint
    approveOnError?: Error
    addVestingOnError?: Error
    member: { name: string; address: string }
    totalAmount: number
    action: 'approveAllowance' | 'submit'
  }) => {
    if (opts.vestingAddress) mockResolvedVestingAddress.value = opts.vestingAddress
    if (opts.balance !== undefined) mockERC20Reads.balanceOf.data.value = opts.balance
    if (opts.allowance !== undefined) mockERC20Reads.allowance.data.value = opts.allowance
    if (opts.approveOnError) {
      mockERC20Writes.approve.mutate.mockImplementationOnce(
        (_args: unknown, options?: ApproveOpts) => options?.onError?.(opts.approveOnError!)
      )
    }
    if (opts.addVestingOnError) {
      mockVestingWrites.addVesting.mutate.mockImplementationOnce(
        (_args: unknown, options?: ApproveOpts) => options?.onError?.(opts.addVestingOnError!)
      )
    }
    wrapper = mountComponent()
    const vm = wrapper.vm as unknown as Vm
    vm.member = opts.member
    vm.totalAmount = opts.totalAmount
    await wrapper.vm.$nextTick()
    await vm[opts.action]()
    await wrapper.vm.$nextTick()
    return vm.errorMessage
  }

  it.each([
    {
      label: 'invalid vesting spender address',
      action: 'approveAllowance' as const,
      vestingAddress: 'not-an-address' as unknown as `0x${string}`,
      member: { name: 'Dave', address: '0x1111111111111111111111111111111111111111' },
      totalAmount: 5,
      expected: 'Invalid vesting contract address'
    },
    {
      label: 'approve mutation onError',
      action: 'approveAllowance' as const,
      approveOnError: new Error('approve boom'),
      member: { name: 'Greta', address: '0x4444444444444444444444444444444444444444' },
      totalAmount: 5,
      expected: 'Approval failed'
    },
    {
      label: 'insufficient balance in submit()',
      action: 'submit' as const,
      balance: 1n,
      member: { name: 'Eve', address: '0x2222222222222222222222222222222222222222' },
      totalAmount: 5,
      expected: 'Insufficient token balance'
    },
    {
      label: 'insufficient allowance in submit()',
      action: 'submit' as const,
      allowance: 1n,
      member: { name: 'Frank', address: '0x3333333333333333333333333333333333333333' },
      totalAmount: 5,
      expected: 'Allowance is less than the total amount'
    },
    {
      label: 'addVesting mutation onError',
      action: 'submit' as const,
      addVestingOnError: new Error('addVesting boom'),
      member: { name: 'Hank', address: '0x5555555555555555555555555555555555555555' },
      totalAmount: 5,
      expected: 'Add vesting failed'
    }
  ])('sets errorMessage for $label', async ({ expected, ...scenario }) => {
    const message = await drive(scenario)
    expect(message).toBe(expected)
  })
})
