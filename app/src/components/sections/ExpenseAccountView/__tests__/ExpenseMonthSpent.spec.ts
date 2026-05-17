import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { USDC_ADDRESS } from '@/constant'
import ExpenseMonthSpent from '../ExpenseMonthSpent.vue'

type Transactions = { transactions: { amount: bigint; tokenAddress: string }[] }

// Holds the result returned to the two useQuery calls (current month, then previous month).
const apolloState = vi.hoisted(() => ({
  current: null as unknown as { value: Transactions | undefined },
  previous: null as unknown as { value: Transactions | undefined },
  error: null as unknown as { value: Error | null },
  callIndex: 0
}))

vi.mock('@vue/apollo-composable', async () => {
  const { ref } = await import('vue')
  apolloState.current = ref<Transactions | undefined>(undefined)
  apolloState.previous = ref<Transactions | undefined>(undefined)
  apolloState.error = ref<Error | null>(null)
  const useQuery = vi.fn(() => {
    // The component calls useQuery for the current month first, then the previous month.
    const isCurrent = apolloState.callIndex++ % 2 === 0
    return {
      result: isCurrent ? apolloState.current : apolloState.previous,
      loading: ref(false),
      error: apolloState.error
    }
  })
  return { useQuery }
})

const usdc = (whole: number) => ({
  amount: BigInt(whole) * 1_000_000n,
  tokenAddress: USDC_ADDRESS
})

const createWrapper = (): VueWrapper =>
  mount(ExpenseMonthSpent, {
    global: {
      stubs: { OverviewCard: { template: '<div><slot /></div>' } }
    }
  })

describe('ExpenseMonthSpent', () => {
  beforeEach(() => {
    apolloState.callIndex = 0
    apolloState.current.value = { transactions: [] }
    apolloState.previous.value = { transactions: [] }
    apolloState.error.value = null
  })

  it('formats the current month spent total', () => {
    apolloState.current.value = { transactions: [usdc(250)] }
    const vm = createWrapper().vm as unknown as { totalMonthlySpentAmount: string }
    expect(vm.totalMonthlySpentAmount).toContain('250')
  })

  it('hides the delta when there is no previous-month baseline', () => {
    apolloState.current.value = { transactions: [usdc(100)] }
    apolloState.previous.value = { transactions: [] }
    const vm = createWrapper().vm as unknown as { spendingDelta: unknown }
    expect(vm.spendingDelta).toBeNull()
  })

  it('computes an upward delta when spending increased', () => {
    apolloState.current.value = { transactions: [usdc(200)] }
    apolloState.previous.value = { transactions: [usdc(100)] }
    const vm = createWrapper().vm as unknown as {
      spendingDelta: { percent: string; direction: string }
    }
    expect(vm.spendingDelta).toEqual({ percent: '100.0', direction: 'up' })
  })

  it('computes a downward delta when spending decreased', () => {
    apolloState.current.value = { transactions: [usdc(60)] }
    apolloState.previous.value = { transactions: [usdc(120)] }
    const vm = createWrapper().vm as unknown as {
      spendingDelta: { percent: string; direction: string }
    }
    expect(vm.spendingDelta).toEqual({ percent: '50.0', direction: 'down' })
  })

  it('renders the delta direction in the slot', () => {
    apolloState.current.value = { transactions: [usdc(200)] }
    apolloState.previous.value = { transactions: [usdc(100)] }
    const wrapper = createWrapper()
    expect(wrapper.find('[data-test="percentage-change"]').text()).toContain('+ 100.0%')
  })
})
