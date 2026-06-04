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

const createWrapper = (): VueWrapper => mount(ExpenseMonthSpent)
const delta = (wrapper: VueWrapper) => wrapper.find('[data-test="percentage-change"]')

describe('ExpenseMonthSpent', () => {
  beforeEach(() => {
    apolloState.callIndex = 0
    apolloState.current.value = { transactions: [] }
    apolloState.previous.value = { transactions: [] }
    apolloState.error.value = null
  })

  it('renders the current month spent total', () => {
    apolloState.current.value = { transactions: [usdc(250)] }
    expect(createWrapper().find('[data-test="amount"]').text()).toContain('250')
  })

  it('hides the delta when there is no previous-month baseline', () => {
    apolloState.current.value = { transactions: [usdc(100)] }
    apolloState.previous.value = { transactions: [] }
    expect(delta(createWrapper()).exists()).toBe(false)
  })

  it('shows an upward delta when spending increased', () => {
    apolloState.current.value = { transactions: [usdc(200)] }
    apolloState.previous.value = { transactions: [usdc(100)] }
    expect(delta(createWrapper()).text()).toContain('+ 100.0%')
  })

  it('shows a downward delta when spending decreased', () => {
    apolloState.current.value = { transactions: [usdc(60)] }
    apolloState.previous.value = { transactions: [usdc(120)] }
    expect(delta(createWrapper()).text()).toContain('- 50.0%')
  })
})
