import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { USDC_ADDRESS } from '@/constant'
import type { ExpenseEventsQuery } from '@/types/ponder/expense'
import ExpenseMonthSpent from '../ExpenseMonthSpent.vue'

// The component now derives monthly spend from the RPC-sourced Expense events
// (via useExpenseEventsViaLogs), filtering token transfers by timestamp. This
// holds the single result ref the mocked composable returns.
const state = vi.hoisted(() => ({
  result: null as unknown as { value: ExpenseEventsQuery | undefined },
  error: null as unknown as { value: Error | null }
}))

vi.mock('@/composables/expense/useExpenseEventsViaLogs', async () => {
  const { ref } = await import('vue')
  state.result = ref<ExpenseEventsQuery | undefined>(undefined)
  state.error = ref<Error | null>(null)
  return {
    useExpenseEventsViaLogs: () => ({
      result: state.result,
      loading: ref(false),
      error: state.error
    })
  }
})

const now = new Date()
// Mid-month noon timestamps land safely inside the component's [1st, last-day] range.
const tsInCurrentMonth = Math.floor(
  new Date(now.getFullYear(), now.getMonth(), 15, 12).getTime() / 1000
)
const tsInPrevMonth = Math.floor(
  new Date(now.getFullYear(), now.getMonth() - 1, 15, 12).getTime() / 1000
)

const emptyEvents = (): ExpenseEventsQuery => ({
  expenseDeposits: { items: [] },
  expenseTokenDeposits: { items: [] },
  expenseTransfers: { items: [] },
  expenseTokenTransfers: { items: [] },
  expenseApprovals: { items: [] },
  expenseOwnerTreasuryWithdrawNatives: { items: [] },
  expenseOwnerTreasuryWithdrawTokens: { items: [] },
  expenseTokenSupportAddeds: { items: [] },
  expenseTokenSupportRemoveds: { items: [] },
  expenseTokenAddressChangeds: { items: [] },
  expenseOwnershipTransferreds: { items: [] }
})

// A USDC token transfer (spend) of `whole` USDC at `timestamp`.
const usdcTransfer = (whole: number, timestamp: number) => ({
  id: `0x-${timestamp}-${whole}`,
  contractAddress: '0xexpense',
  withdrawer: '0x1111111111111111111111111111111111111111',
  to: '0x2222222222222222222222222222222222222222',
  token: USDC_ADDRESS,
  amount: (BigInt(whole) * 1_000_000n).toString(),
  timestamp
})

const setSpend = (currentUsdc: number[], prevUsdc: number[]) => {
  const events = emptyEvents()
  events.expenseTokenTransfers.items = [
    ...currentUsdc.map((w) => usdcTransfer(w, tsInCurrentMonth)),
    ...prevUsdc.map((w) => usdcTransfer(w, tsInPrevMonth))
  ]
  state.result.value = events
}

const createWrapper = (): VueWrapper => mount(ExpenseMonthSpent)
const delta = (wrapper: VueWrapper) => wrapper.find('[data-test="percentage-change"]')

describe('ExpenseMonthSpent', () => {
  beforeEach(() => {
    state.result.value = emptyEvents()
    state.error.value = null
  })

  it('renders the current month spent total', () => {
    setSpend([250], [])
    expect(createWrapper().find('[data-test="amount"]').text()).toContain('250')
  })

  it('hides the delta when there is no previous-month baseline', () => {
    setSpend([100], [])
    expect(delta(createWrapper()).exists()).toBe(false)
  })

  it('shows an upward delta when spending increased', () => {
    setSpend([200], [100])
    expect(delta(createWrapper()).text()).toContain('+ 100.0%')
  })

  it('shows a downward delta when spending decreased', () => {
    setSpend([60], [120])
    expect(delta(createWrapper()).text()).toContain('- 50.0%')
  })
})
