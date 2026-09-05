import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import type { Ref } from 'vue'
import { NETWORK } from '@/constant'
import { mockTeamData, mockToast, mockUserStore, renderWithProviders } from '@/tests/mocks'
import { buildJournal } from '@/utils/accounting/generalLedger'
import { makeEntry } from '@/utils/accounting/ledgerEntry'
import type { JournalEntry } from '@/utils/accounting/journalEntry'
import ClassificationTable from '../ClassificationTable.vue'

const state = vi.hoisted(() => ({
  journal: null as Ref<JournalEntry[]> | null,
  loading: null as Ref<boolean> | null,
  saving: null as Ref<boolean> | null,
  removing: null as Ref<boolean> | null,
  upsert: vi.fn(),
  remove: vi.fn()
}))

vi.mock('@/composables/accounting/useAccountingContext', async () => {
  const { ref } = await vi.importActual<typeof import('vue')>('vue')
  state.journal = ref([])
  state.loading = ref(false)
  // Deliberately no transitional entries: the screen must consume only the journal.
  return { useAccountingContext: () => ({ journal: state.journal, isLoading: state.loading }) }
})

vi.mock('@/queries/classification.queries', async () => {
  const { ref } = await vi.importActual<typeof import('vue')>('vue')
  state.saving = ref(false)
  state.removing = ref(false)
  return {
    useUpsertClassificationMutation: () => ({ mutate: state.upsert, isPending: state.saving }),
    useDeleteClassificationMutation: () => ({ mutate: state.remove, isPending: state.removing })
  }
})

const TX = `0x${'c'.repeat(64)}`
const originalExplorerUrl = NETWORK.blockExplorerUrl
const withdrawal = () =>
  makeEntry({
    id: `${TX}-2`,
    timestamp: 100,
    useCase: 'CASH-OUT',
    debit: 'Interest Expense',
    credit: 'Cash — Bank',
    creditInstance: '0x1111111111111111111111111111111111111111',
    amountUsd: 100,
    token: 'usdc',
    rawAmount: '100000000',
    rate: 1,
    classified: 'INTEREST_EXPENSE',
    memo: 'Pay loan interest'
  })

let wrapper: ReturnType<typeof renderWithProviders> | undefined
const render = () => (wrapper = renderWithProviders(ClassificationTable))

beforeEach(() => {
  vi.clearAllMocks()
  state.loading!.value = false
  state.saving!.value = false
  state.removing!.value = false
  NETWORK.blockExplorerUrl = 'https://explorer.example/'
  mockUserStore.address = mockTeamData.ownerAddress!
  const source = withdrawal()
  state.journal!.value = buildJournal([
    source,
    makeEntry({
      ...source,
      id: `${TX}-3`,
      useCase: 'FEE',
      debit: 'Transaction Fee Expense',
      amountUsd: 1,
      rawAmount: '1000000',
      classified: undefined
    })
  ])
})

afterEach(() => {
  wrapper?.unmount()
  NETWORK.blockExplorerUrl = originalExplorerUrl
})

describe('Classification journal owner workflow', () => {
  it('renders all fee and principal lines with one editor and one transaction link', () => {
    const view = render()
    expect(view.get('[data-test="classify-count"]').text()).toContain('1 journal')
    expect(view.findAll('[data-test="classify-account"]').map((node) => node.text())).toEqual([
      'Interest Expense',
      'Transaction Fee Expense',
      'Cash — Bank'
    ])
    expect(view.findAll('[data-test="classify-credit"]').map((node) => node.text())).toContain(
      '$101.00'
    )
    expect(view.findAll('[data-test="ledger-classify-trigger"]')).toHaveLength(1)
    const link = view.get('[data-test="classify-tx-hash"]')
    expect(link.attributes('href')).toContain(`/tx/${TX}`)
    expect(link.attributes('target')).toBe('_blank')
  })

  it('saves using the source event identity and preserves the memo', async () => {
    const view = render()
    await view.get('[data-test="ledger-classify-trigger"]').trigger('click')
    await view.get('[data-test="ledger-classify-save"]').trigger('click')
    expect(state.upsert).toHaveBeenCalledWith(
      {
        body: {
          teamId: '1',
          txId: `${TX}-2`,
          category: 'INTEREST_EXPENSE',
          memo: 'Pay loan interest'
        }
      },
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) })
    )
    // A successful refetch supplies the saved state; drafts do not change journal lines.
    state.upsert.mock.calls[0]![1].onSuccess()
    await flushPromises()
    expect(mockToast.add).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Transaction classified' })
    )
  })

  it('reverts the same source decision rather than creating a transaction-hash key', async () => {
    const view = render()
    await view.get('[data-test="ledger-classify-trigger"]').trigger('click')
    await view.get('[data-test="ledger-classify-clear"]').trigger('click')
    expect(state.remove).toHaveBeenCalledWith(
      { queryParams: { teamId: '1', txId: `${TX}-2` } },
      expect.any(Object)
    )
    state.remove.mock.calls[0]![1].onSuccess()
    await flushPromises()
    expect(mockToast.add).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Reverted to the inferred classification' })
    )
  })

  it('keeps the previous decision and reports a failed save', async () => {
    const view = render()
    await view.get('[data-test="ledger-classify-trigger"]').trigger('click')
    await view.get('[data-test="ledger-classify-memo"]').setValue('Draft note')
    await view.get('[data-test="ledger-classify-save"]').trigger('click')
    state.upsert.mock.calls[0]![1].onError(new Error('Request failed'))
    await flushPromises()
    expect(view.get('[data-test="ledger-classify-trigger"]').text()).toBe('Interest')
    expect(state.journal!.value[0]!.legacyClassification!.targets[0]!.memo).toBe(
      'Pay loan interest'
    )
    expect(mockToast.add).toHaveBeenCalledWith({
      title: 'Could not save the classification',
      color: 'error'
    })
  })

  it('keeps the previous decision when reverting fails', async () => {
    const view = render()
    await view.get('[data-test="ledger-classify-clear"]').trigger('click')
    state.remove.mock.calls[0]![1].onError(new Error('Request failed'))
    await flushPromises()
    expect(view.get('[data-test="ledger-classify-trigger"]').text()).toBe('Interest')
    expect(state.journal!.value[0]!.legacyClassification!.targets[0]!.memo).toBe(
      'Pay loan interest'
    )
    expect(mockToast.add).toHaveBeenCalledWith({
      title: 'Could not revert the classification',
      color: 'error'
    })
  })

  it('requires a category before saving a new classification', () => {
    state.journal!.value = buildJournal([makeEntry({ ...withdrawal(), classified: undefined })])
    const view = render()
    expect(view.get('[data-test="ledger-classify-trigger"]').text()).toBe('Inferred')
    expect(view.get('[data-test="ledger-classify-save"]').attributes('disabled')).toBeDefined()
    expect(view.find('[data-test="ledger-classify-clear"]').exists()).toBe(false)
    expect(state.upsert).not.toHaveBeenCalled()
  })

  it('renders a plain hash when no block explorer is configured', () => {
    NETWORK.blockExplorerUrl = ''
    const view = render()
    expect(view.find('[data-test="classify-tx-hash"]').exists()).toBe(false)
    expect(view.findAll('[data-test="classify-account"]')).toHaveLength(3)
  })

  it('disables save and revert while a mutation is pending', async () => {
    const view = render()
    await view.get('[data-test="ledger-classify-trigger"]').trigger('click')
    state.saving!.value = true
    await flushPromises()
    expect(view.get('[data-test="ledger-classify-save"]').attributes('disabled')).toBeDefined()
    expect(view.get('[data-test="ledger-classify-clear"]').attributes('disabled')).toBeDefined()
  })

  it('shows saved decisions without an editor for a non-owner', () => {
    mockUserStore.address = '0x2222222222222222222222222222222222222222'
    const view = render()
    expect(view.find('[data-test="ledger-classify-trigger"]').exists()).toBe(false)
    expect(view.text()).toContain('Interest — Pay loan interest')
    expect(view.findAll('[data-test="classify-account"]')).toHaveLength(3)
  })

  it('keeps a compound transaction visible once with saved decisions but no editor', () => {
    state.journal!.value = buildJournal([
      withdrawal(),
      makeEntry({ ...withdrawal(), id: `${TX}-8`, memo: 'Second interest payment' })
    ])
    const view = render()
    expect(view.get('[data-test="classify-count"]').text()).toContain('1 journal')
    expect(view.find('[data-test="ledger-classify-trigger"]').exists()).toBe(false)
    expect(view.findAll('[data-test="classify-readonly"]')).toHaveLength(1)
    expect(view.text()).toContain('Pay loan interest')
    expect(view.text()).toContain('Second interest payment')
  })

  it('shows loading then an empty state when the journal contains only a deposit', async () => {
    state.loading!.value = true
    state.journal!.value = buildJournal([
      makeEntry({
        ...withdrawal(),
        useCase: 'UC-BANK-02',
        debit: 'Cash — Bank',
        credit: 'Service Revenue',
        classified: undefined
      })
    ])
    const view = render()
    expect(view.find('[data-test="classify-loading"]').exists()).toBe(true)
    expect(view.find('[data-test="classification-table"]').exists()).toBe(false)
    state.loading!.value = false
    await flushPromises()
    expect(view.find('[data-test="classify-empty"]').exists()).toBe(true)
    expect(view.find('[data-test="ledger-classify-trigger"]').exists()).toBe(false)
  })
})
