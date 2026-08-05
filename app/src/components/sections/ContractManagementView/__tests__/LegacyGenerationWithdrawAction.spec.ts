import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import type { FolderVersion } from '@/artifacts/registry'
import type { CashOutRunStep } from '@/composables/cashOut'
import { mockBankReads, mockTeamStore, mockUseContractBalance, mockUserStore } from '@/tests/mocks'
import { useCurrencyStore } from '@/stores'

const OWNER_ADDRESS = '0x742d35cc6bf8c55c6c2e013e5492d2b6637e0886'
const NON_OWNER = '0x00000000000000000000000000000000000000bb'
const CURRENT_BANK = '0x1111111111111111111111111111111111111111'
const LEGACY_OFFICER = '0x00000000000000000000000000000000000000f0'
const LEGACY_BANK = '0x00000000000000000000000000000000000000b1'
const LEGACY_EXPENSE = '0x00000000000000000000000000000000000000b2'
const LEGACY_CASH_REM = '0x00000000000000000000000000000000000000b3'

// Controllable orchestrator stub — the sequence itself is covered by
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

const mockBeaconFolder = {
  folder: ref<FolderVersion | undefined>('V1'),
  isPending: ref(false),
  isError: ref(false)
}

vi.mock('@/composables/contracts/useOfficerBeaconFolder', () => ({
  useOfficerBeaconFolderQuery: vi.fn(() => mockBeaconFolder),
  useOfficerBeaconFolder: vi.fn(() => mockBeaconFolder.folder)
}))

import LegacyGenerationWithdrawAction from '../LegacyGenerationWithdrawAction.vue'
import { useCashOutAll } from '@/composables/cashOut'

const BUTTON = '[data-test="legacy-withdraw-button"]'
const CONFIRM = '[data-test="legacy-withdraw-confirm"]'

const legacyContracts = [
  { address: LEGACY_BANK, type: 'Bank' },
  { address: LEGACY_EXPENSE, type: 'ExpenseAccountEIP712' },
  { address: LEGACY_CASH_REM, type: 'CashRemunerationEIP712' }
]

const createWrapper = (contracts = legacyContracts) =>
  mount(LegacyGenerationWithdrawAction, {
    props: { officerAddress: LEGACY_OFFICER, contracts },
    global: { stubs: { teleport: true } }
  })

/**
 * Why the action is unavailable — the component funnels every disabled state
 * through the tooltip, so this is the user-visible explanation.
 */
const blockedReason = (wrapper: ReturnType<typeof createWrapper>) =>
  wrapper.findComponent({ name: 'UTooltip' }).props('text') as string | undefined

const step = (over: Partial<CashOutRunStep>): CashOutRunStep => ({
  key: 'bank',
  label: 'Bank',
  status: 'pending',
  detail: '',
  error: '',
  ...over
})

describe('LegacyGenerationWithdrawAction', () => {
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
    mockBeaconFolder.folder.value = 'V1'
    mockBeaconFolder.isPending.value = false
    mockBeaconFolder.isError.value = false
    mockCashOut.steps.value = []
    mockCashOut.isRunning.value = false
    mockCashOut.isComplete.value = false
    mockCashOut.hasFailed.value = false
  })

  it('drives the sequence over the legacy generation, into the current Bank', () => {
    createWrapper()

    expect(vi.mocked(useCashOutAll)).toHaveBeenCalledWith({
      sources: {
        bank: expect.objectContaining({ value: LEGACY_BANK }),
        expense: expect.objectContaining({ value: LEGACY_EXPENSE }),
        cashRemuneration: expect.objectContaining({ value: LEGACY_CASH_REM })
      },
      to: expect.objectContaining({ value: CURRENT_BANK })
    })
  })

  it('enables the button for the owner of a supported generation holding funds', () => {
    const wrapper = createWrapper()

    expect(wrapper.get(BUTTON).attributes('disabled')).toBeUndefined()
    expect(blockedReason(wrapper)).toBeUndefined()
  })

  it('offers a Bank-only withdrawal on generations that predate ownerWithdrawAllToBank', async () => {
    mockBeaconFolder.folder.value = 'V0.1'
    const wrapper = createWrapper()

    expect(wrapper.get(BUTTON).attributes('disabled')).toBeUndefined()
    await wrapper.get(BUTTON).trigger('click')
    await wrapper.get(CONFIRM).trigger('click')
    await flushPromises()

    const plan = mockCashOut.start.mock.calls[0][0] as { key: string }[]
    expect(plan.map((s) => s.key)).toEqual(['bank'])
  })

  it('never hands a non-sweeping generation its source accounts', () => {
    mockBeaconFolder.folder.value = 'V0'
    createWrapper()

    const { sources } = vi.mocked(useCashOutAll).mock.calls[0][0] as {
      sources: Record<string, { value?: string }>
    }
    expect(sources.bank.value).toBe(LEGACY_BANK)
    expect(sources.expense.value).toBeUndefined()
    expect(sources.cashRemuneration.value).toBeUndefined()
  })

  it('warns which accounts a non-sweeping generation leaves behind', async () => {
    mockBeaconFolder.folder.value = 'V0'
    const wrapper = createWrapper()
    await wrapper.get(BUTTON).trigger('click')

    expect(wrapper.find('[data-test="legacy-withdraw-bank-only-notice"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="legacy-withdraw-stranded-expense"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="legacy-withdraw-stranded-cashRemuneration"]').exists()).toBe(
      true
    )
    // The source accounts are not presented as things this run withdraws.
    expect(wrapper.find('[data-test="legacy-withdraw-review-expense"]').exists()).toBe(false)
  })

  it('blocks a non-sweeping generation whose Bank is already empty', () => {
    mockBeaconFolder.folder.value = 'V0'
    mockUseContractBalance.total.value = {
      usd: { value: 0, formatted: '$0' },
      local: { value: 0, formatted: '$0' }
    }
    const wrapper = createWrapper()

    expect(wrapper.get(BUTTON).attributes('disabled')).toBeDefined()
    expect(blockedReason(wrapper)).toContain('can only have their Bank emptied')
  })

  it('blocks while the generation is still being resolved', () => {
    mockBeaconFolder.folder.value = undefined
    mockBeaconFolder.isPending.value = true
    const wrapper = createWrapper()

    expect(wrapper.get(BUTTON).attributes('disabled')).toBeDefined()
    expect(blockedReason(wrapper)).toContain('Checking which contract generation')
  })

  it('blocks when the generation could not be read from the chain', () => {
    mockBeaconFolder.folder.value = undefined
    mockBeaconFolder.isError.value = true
    const wrapper = createWrapper()

    expect(wrapper.get(BUTTON).attributes('disabled')).toBeDefined()
    expect(blockedReason(wrapper)).toContain('Could not read this generation')
  })

  it('blocks anyone who does not own the legacy contracts', () => {
    mockUserStore.address = NON_OWNER
    const wrapper = createWrapper()

    expect(wrapper.get(BUTTON).attributes('disabled')).toBeDefined()
    expect(blockedReason(wrapper)).toContain('Only the owner')
  })

  it('blocks a generation with no Bank to withdraw through', () => {
    const wrapper = createWrapper([{ address: LEGACY_EXPENSE, type: 'ExpenseAccountEIP712' }])

    expect(wrapper.get(BUTTON).attributes('disabled')).toBeDefined()
    expect(blockedReason(wrapper)).toContain('no Bank to withdraw through')
  })

  it('blocks a generation whose Bank is the one the team uses today', () => {
    const wrapper = createWrapper([{ address: CURRENT_BANK, type: 'Bank' }])

    expect(wrapper.get(BUTTON).attributes('disabled')).toBeDefined()
    expect(blockedReason(wrapper)).toContain('already holds the current Bank')
  })

  it('blocks when the legacy contracts are empty', () => {
    mockUseContractBalance.total.value = {
      usd: { value: 0, formatted: '$0' },
      local: { value: 0, formatted: '$0' }
    }
    const wrapper = createWrapper()

    expect(wrapper.get(BUTTON).attributes('disabled')).toBeDefined()
    expect(blockedReason(wrapper)).toContain('hold no funds')
  })

  it('blocks writes on an archived team', () => {
    mockTeamStore.currentTeamMeta = {
      isPending: false,
      data: { ...mockTeamStore.currentTeam, isArchived: true }
    }
    const wrapper = createWrapper()

    expect(wrapper.get(BUTTON).attributes('disabled')).toBeDefined()
  })

  it('reviews each funded account before signing', async () => {
    const wrapper = createWrapper()
    await wrapper.get(BUTTON).trigger('click')

    expect(wrapper.find('[data-test="legacy-withdraw-review"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="legacy-withdraw-review-cashRemuneration"]').exists()).toBe(
      true
    )
    expect(wrapper.find('[data-test="legacy-withdraw-review-expense"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="legacy-withdraw-review-destination"]').text()).toContain(
      'Old Bank → current Bank'
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
    expect(wrapper.find('[data-test="legacy-withdraw-progress"]').exists()).toBe(true)
  })

  it('surfaces a failed step and offers a retry', async () => {
    const wrapper = createWrapper()
    await wrapper.get(BUTTON).trigger('click')
    await wrapper.get(CONFIRM).trigger('click')

    mockCashOut.steps.value = [
      step({ key: 'cashRemuneration', label: 'Cash Remuneration', status: 'success' }),
      step({ key: 'expense', label: 'Expense Account', status: 'failed', error: 'Contract paused' })
    ]
    mockCashOut.hasFailed.value = true
    await flushPromises()

    expect(wrapper.find('[data-test="legacy-withdraw-error-expense"]').text()).toContain(
      'Contract paused'
    )

    await wrapper.get('[data-test="legacy-withdraw-retry"]').trigger('click')
    expect(mockCashOut.retry).toHaveBeenCalledTimes(1)
  })

  it('shows a completion notice when the sequence finishes', async () => {
    const wrapper = createWrapper()
    await wrapper.get(BUTTON).trigger('click')
    await wrapper.get(CONFIRM).trigger('click')

    mockCashOut.steps.value = [step({ key: 'bank', label: 'Bank', status: 'success' })]
    mockCashOut.isComplete.value = true
    await flushPromises()

    expect(wrapper.find('[data-test="legacy-withdraw-complete"]').exists()).toBe(true)
  })
})
