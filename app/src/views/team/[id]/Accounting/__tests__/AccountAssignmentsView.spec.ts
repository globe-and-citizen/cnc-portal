import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import type { Ref } from 'vue'
import { NETWORK } from '@/constant'
import type { JournalAccountAssignmentRecord } from '@/types/journal-account-assignment'
import { mockTeamData, mockToast, mockUserStore, renderWithProviders } from '@/tests/mocks'
import { buildJournal } from '@/utils/accounting/generalLedger'
import { applyJournalAccountAssignments } from '@/utils/accounting/journalAccountAssignment'
import { makeEntry } from '@/utils/accounting/ledgerEntry'
import type { JournalEntry } from '@/utils/accounting/types'
import AccountAssignmentsView from '../AccountAssignmentsView.vue'

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
  return { useAccountingContext: () => ({ journal: state.journal, isLoading: state.loading }) }
})

vi.mock('@/queries/journalAccountAssignment.queries', async () => {
  const { ref } = await vi.importActual<typeof import('vue')>('vue')
  state.saving = ref(false)
  state.removing = ref(false)
  return {
    useUpsertJournalAccountAssignmentMutation: () => ({
      mutate: state.upsert,
      isPending: state.saving
    }),
    useDeleteJournalAccountAssignmentMutation: () => ({
      mutate: state.remove,
      isPending: state.removing
    })
  }
})

const TX = `0x${'c'.repeat(64)}`
const originalExplorerUrl = NETWORK.blockExplorerUrl
const withdrawal = () =>
  makeEntry({
    id: `${TX}-2`,
    timestamp: 100,
    useCase: 'CASH-OUT',
    debit: 'Operating Expense',
    credit: 'Cash — Bank',
    creditInstance: '0x1111111111111111111111111111111111111111',
    amountUsd: 100,
    token: 'usdc',
    rawAmount: '100000000',
    rate: 1,
    memo: 'External cash payment'
  })

const assignment = (): JournalAccountAssignmentRecord => ({
  id: 1,
  teamId: 1,
  journalEntryId: TX,
  accountId: 'interest-expense',
  memo: 'Pay loan interest',
  assignedByAddress: mockTeamData.ownerAddress!,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z'
})

let wrapper: ReturnType<typeof renderWithProviders> | undefined
const render = () => (wrapper = renderWithProviders(AccountAssignmentsView))

beforeEach(() => {
  vi.clearAllMocks()
  state.loading!.value = false
  state.saving!.value = false
  state.removing!.value = false
  NETWORK.blockExplorerUrl = 'https://explorer.example/'
  mockUserStore.address = mockTeamData.ownerAddress!
  const source = withdrawal()
  state.journal!.value = applyJournalAccountAssignments(
    buildJournal([
      source,
      makeEntry({
        ...source,
        id: `${TX}-3`,
        useCase: 'FEE',
        debit: 'Transaction Fee Expense',
        amountUsd: 1,
        rawAmount: '1000000'
      })
    ]),
    [assignment()]
  )
})

afterEach(() => {
  wrapper?.unmount()
  NETWORK.blockExplorerUrl = originalExplorerUrl
})

describe('Journal account assignment owner workflow', () => {
  it('renders all transaction lines with one editor and one explorer link', () => {
    const view = render()
    expect(view.get('[data-test="assignment-count"]').text()).toContain('1 journal')
    expect(view.findAll('[data-test="assignment-account"]').map((node) => node.text())).toEqual([
      'Interest Expense',
      'Transaction Fee Expense',
      'Cash — Bank'
    ])
    expect(view.findAll('[data-test="assignment-credit"]').map((node) => node.text())).toContain(
      '$101.00'
    )
    expect(view.findAll('[data-test="ledger-account-assignment-trigger"]')).toHaveLength(1)
    const link = view.get('[data-test="assignment-tx-hash"]')
    expect(link.attributes('href')).toContain(`/tx/${TX}`)
    expect(link.attributes('target')).toBe('_blank')
  })

  it('saves the account ID against the complete JournalEntry hash', async () => {
    const view = render()
    await view.get('[data-test="ledger-account-assignment-trigger"]').trigger('click')
    await view.get('[data-test="ledger-account-assignment-save"]').trigger('click')
    expect(state.upsert).toHaveBeenCalledWith(
      {
        body: {
          teamId: '1',
          journalEntryId: TX,
          accountId: 'interest-expense',
          memo: 'Pay loan interest'
        }
      },
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) })
    )
    state.upsert.mock.calls[0]![1].onSuccess()
    await flushPromises()
    expect(mockToast.add).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Journal account assigned' })
    )
  })

  it('reverts the same JournalEntry assignment', async () => {
    const view = render()
    await view.get('[data-test="ledger-account-assignment-clear"]').trigger('click')
    expect(state.remove).toHaveBeenCalledWith(
      { queryParams: { teamId: '1', journalEntryId: TX } },
      expect.any(Object)
    )
    state.remove.mock.calls[0]![1].onSuccess()
    await flushPromises()
    expect(mockToast.add).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Reverted to the inferred account' })
    )
  })

  it('keeps the previous decision and reports a failed save', async () => {
    const view = render()
    await view.get('[data-test="ledger-account-assignment-trigger"]').trigger('click')
    await view.get('[data-test="ledger-account-assignment-memo"]').setValue('Draft note')
    await view.get('[data-test="ledger-account-assignment-save"]').trigger('click')
    state.upsert.mock.calls[0]![1].onError(new Error('Request failed'))
    await flushPromises()
    expect(view.get('[data-test="ledger-account-assignment-trigger"]').text()).toBe(
      'Interest Expense'
    )
    expect(state.journal!.value[0]!.accountAssignment?.memo).toBe('Pay loan interest')
    expect(mockToast.add).toHaveBeenCalledWith({
      title: 'Could not save the account assignment',
      color: 'error'
    })
  })

  it('requires an account before saving a new assignment', () => {
    state.journal!.value = buildJournal([withdrawal()])
    const view = render()
    expect(view.get('[data-test="ledger-account-assignment-trigger"]').text()).toBe(
      'Inferred account'
    )
    expect(
      view.get('[data-test="ledger-account-assignment-save"]').attributes('disabled')
    ).toBeDefined()
    expect(view.find('[data-test="ledger-account-assignment-clear"]').exists()).toBe(false)
  })

  it('shows saved decisions without editing controls to a non-owner', () => {
    mockUserStore.address = '0x2222222222222222222222222222222222222222'
    const view = render()
    expect(view.find('[data-test="ledger-account-assignment-trigger"]').exists()).toBe(false)
    expect(view.text()).toContain('Interest Expense — Pay loan interest')
  })

  it('keeps a compound JournalEntry visible once but read-only', () => {
    const first = withdrawal()
    state.journal!.value = buildJournal([
      first,
      makeEntry({ ...first, id: `${TX}-8`, counterparty: mockTeamData.ownerAddress })
    ])
    const view = render()
    expect(view.get('[data-test="assignment-count"]').text()).toContain('1 journal')
    expect(view.find('[data-test="ledger-account-assignment-trigger"]').exists()).toBe(false)
    expect(view.findAll('[data-test="assignment-readonly"]')).toHaveLength(1)
  })

  it('shows loading then an empty state when the journal only contains a deposit', async () => {
    state.loading!.value = true
    state.journal!.value = buildJournal([
      makeEntry({
        ...withdrawal(),
        useCase: 'UC-BANK-02',
        debit: 'Cash — Bank',
        credit: 'Service Revenue'
      })
    ])
    const view = render()
    expect(view.find('[data-test="assignment-loading"]').exists()).toBe(true)
    expect(view.find('[data-test="account-assignment-table"]').exists()).toBe(false)
    state.loading!.value = false
    await flushPromises()
    expect(view.find('[data-test="assignment-empty"]').exists()).toBe(true)
  })
})
