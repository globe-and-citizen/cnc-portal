import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { renderWithProviders } from '@/tests/mocks'
import { provideAccounting } from '@/composables/accounting/useAccountingContext'
import type {
  AccountingCompleteness,
  AccountingDiagnostic,
  AccountingSourceStatus
} from '@/utils/accounting/types'
import AccountingPage from '../AccountingPage.vue'

vi.mock('@/composables/accounting/useAccountingContext', () => ({ provideAccounting: vi.fn() }))

const sources: AccountingSourceStatus[] = [
  { source: 'company', label: 'Company', state: 'ready' },
  { source: 'bank-events', label: 'Bank history', state: 'ready' },
  { source: 'token-rates', label: 'Token USD rates', state: 'ready' }
]

function setAccountingState(
  state: AccountingCompleteness,
  diagnostics: AccountingDiagnostic[] = []
): void {
  vi.mocked(provideAccounting).mockReturnValue({
    journal: ref([]),
    status: {
      state: ref(state),
      sources: ref(sources),
      diagnostics: ref(diagnostics),
      isLoading: ref(state === 'loading')
    },
    refetch: vi.fn()
  })
}

describe('AccountingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setAccountingState('ready')
  })

  it('renders the shared Accounting shell and its nested route outlet', () => {
    const wrapper = renderWithProviders(AccountingPage)

    expect(wrapper.text()).toContain('Accounting')
    expect(wrapper.find('[data-test="router-view"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="accounting-error"]').exists()).toBe(false)
  })

  it('withholds reports while material sources are loading', () => {
    setAccountingState('loading')

    const wrapper = renderWithProviders(AccountingPage)

    expect(wrapper.find('[data-test="accounting-loading"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="router-view"]').exists()).toBe(false)
  })

  it('withholds partial reports and explains every typed diagnostic', () => {
    setAccountingState('partial', [
      { kind: 'source-unavailable', source: 'company' },
      {
        kind: 'source-scan-failed',
        source: 'bank-events',
        address: '0x1111111111111111111111111111111111111111'
      },
      {
        kind: 'block-timestamp-unavailable',
        source: 'bank-events',
        txHash: `0x${'a'.repeat(64)}`,
        blockNumber: '42'
      },
      { kind: 'orphan-bank-fee', txHash: `0x${'b'.repeat(64)}` },
      { kind: 'receipt-unavailable', txHash: `0x${'c'.repeat(64)}` },
      { kind: 'rate-unavailable', token: 'native' }
    ])

    const wrapper = renderWithProviders(AccountingPage)

    expect(wrapper.find('[data-test="accounting-gaps"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="router-view"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('Reports are withheld')
    expect(wrapper.text()).toContain('Company could not be loaded')
    expect(wrapper.text()).toContain('Bank history could not scan contract')
    expect(wrapper.text()).toContain('block timestamp is unavailable')
    expect(wrapper.text()).toContain('matching outflow is unavailable')
    expect(wrapper.text()).toContain('Transaction receipt')
    expect(wrapper.text()).toContain('NATIVE movements were withheld')
  })

  it('withholds reports after a fatal company-source failure', () => {
    setAccountingState('failed', [{ kind: 'source-unavailable', source: 'company' }])

    const wrapper = renderWithProviders(AccountingPage)

    expect(wrapper.find('[data-test="accounting-error"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="router-view"]').exists()).toBe(false)
  })
})
