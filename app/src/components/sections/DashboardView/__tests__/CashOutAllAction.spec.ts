import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import type { CashOutRunStep } from '@/composables/cashOut'
import { mockBankReads, mockUseContractBalance, mockUserStore } from '@/tests/mocks'
import { useCurrencyStore } from '@/stores'

const OWNER_ADDRESS = '0x742d35cc6bf8c55c6c2e013e5492d2b6637e0886'
const NON_OWNER = '0x00000000000000000000000000000000000000bb'

// Controllable orchestrator stub — the real sequence logic is covered by
// useCashOutAll.spec.ts; here we only drive the component UI from its state.
const mockCashOut = {
  steps: ref<CashOutRunStep[]>([]),
  currentIndex: ref(0),
  isRunning: ref(false),
  isComplete: ref(false),
  hasFailed: ref(false),
  failedStep: ref<CashOutRunStep | null>(null),
  start: vi.fn(),
  retry: vi.fn(),
  reset: vi.fn()
}

vi.mock('@/composables/cashOut', async (importOriginal) => {
  const actual: object = await importOriginal()
  return { ...actual, useCashOutAll: vi.fn(() => mockCashOut) }
})

import CashOutAllAction from '../CashOutAllAction.vue'

const BUTTON = '[data-test="cash-out-all-button"]'
const CONFIRM = '[data-test="cash-out-all-confirm"]'

const createWrapper = () => mount(CashOutAllAction, { global: { stubs: { teleport: true } } })

const step = (over: Partial<CashOutRunStep>): CashOutRunStep => ({
  key: 'bank',
  label: 'Bank',
  status: 'pending',
  detail: '',
  error: '',
  ...over
})

describe('CashOutAllAction', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    // Pinia auto-unwraps the store's `localCurrency` ref in production; the
    // shared mock does not, so return a plain object for `.code` lookups.
    vi.mocked(useCurrencyStore).mockReturnValue({
      localCurrency: { code: 'USD', name: 'US Dollar', symbol: '$' }
    } as unknown as ReturnType<typeof useCurrencyStore>)
    mockBankReads.owner.data.value = OWNER_ADDRESS
    mockUserStore.address = OWNER_ADDRESS
    mockCashOut.steps.value = []
    mockCashOut.isRunning.value = false
    mockCashOut.isComplete.value = false
    mockCashOut.hasFailed.value = false
  })

  it('hides the button when the connected user is not the Bank owner', () => {
    mockUserStore.address = NON_OWNER
    expect(createWrapper().find(BUTTON).exists()).toBe(false)
  })

  it('shows an enabled button for the owner when an account holds funds', () => {
    const wrapper = createWrapper()
    expect(wrapper.get(BUTTON).attributes('disabled')).toBeUndefined()
  })

  it('disables the button when every account is empty', () => {
    mockUseContractBalance.total.value = {}
    expect(createWrapper().get(BUTTON).attributes('disabled')).toBeDefined()
  })

  it('opens a review listing the source accounts and the projected Bank payout', async () => {
    const wrapper = createWrapper()
    await wrapper.get(BUTTON).trigger('click')

    expect(wrapper.find('[data-test="cash-out-review"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="cash-out-review-cashRemuneration"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="cash-out-review-expense"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="cash-out-review-bank"]').text()).toContain(
      'Bank → your wallet'
    )
  })

  it('starts the sequence with the built plan and moves to the progress phase', async () => {
    const wrapper = createWrapper()
    await wrapper.get(BUTTON).trigger('click')
    await wrapper.get(CONFIRM).trigger('click')
    await flushPromises()

    expect(mockCashOut.start).toHaveBeenCalledTimes(1)
    const plan = mockCashOut.start.mock.calls[0][0] as { key: string }[]
    expect(plan.map((s) => s.key)).toEqual(['cashRemuneration', 'expense', 'bank'])
    expect(wrapper.find('[data-test="cash-out-progress"]').exists()).toBe(true)
  })

  it('renders each step and exposes a retry when a step fails', async () => {
    const wrapper = createWrapper()
    await wrapper.get(BUTTON).trigger('click')
    await wrapper.get(CONFIRM).trigger('click')

    mockCashOut.steps.value = [
      step({ key: 'cashRemuneration', label: 'Cash Remuneration', status: 'success' }),
      step({
        key: 'expense',
        label: 'Expense Account',
        status: 'failed',
        error: 'RPC node unavailable'
      }),
      step({ key: 'bank', label: 'Bank', status: 'pending' })
    ]
    mockCashOut.hasFailed.value = true
    await flushPromises()

    expect(wrapper.find('[data-test="cash-out-step-expense"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="cash-out-error-expense"]').text()).toContain(
      'RPC node unavailable'
    )

    await wrapper.get('[data-test="cash-out-all-retry"]').trigger('click')
    expect(mockCashOut.retry).toHaveBeenCalledTimes(1)
  })

  it('shows a completion notice when the sequence finishes', async () => {
    const wrapper = createWrapper()
    await wrapper.get(BUTTON).trigger('click')
    await wrapper.get(CONFIRM).trigger('click')

    mockCashOut.steps.value = [step({ key: 'bank', label: 'Bank', status: 'success' })]
    mockCashOut.isComplete.value = true
    await flushPromises()

    expect(wrapper.find('[data-test="cash-out-complete"]').exists()).toBe(true)
  })
})
