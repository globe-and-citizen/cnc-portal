import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import type { Address } from 'viem'
import MigrationOwnerSweep from '@/components/sections/SherTokenView/MigrationOwnerSweep.vue'
import { renderWithProviders } from '@/tests/mocks'
import type { InvestorMigration } from '@/queries/investorMigration.queries'

const mockSweepState = {
  mutate: vi.fn(),
  mutateAsync: vi.fn().mockResolvedValue(undefined),
  isPending: ref(false),
  isError: ref(false),
  error: ref<Error | null>(null),
  data: ref(null),
  reset: vi.fn()
}

const mockCompletionState = {
  mutate: vi.fn(),
  mutateAsync: vi.fn().mockResolvedValue(undefined),
  isPending: ref(false),
  isError: ref(false),
  error: ref<Error | null>(null),
  data: ref(null),
  reset: vi.fn()
}

vi.mock('@/composables/investor/useSweepMigration', () => ({
  useSweepMigrationMutation: vi.fn(() => mockSweepState),
  useCompleteMigrationMutation: vi.fn(() => mockCompletionState)
}))

const INVESTOR = '0x3333333333333333333333333333333333333333' as Address
const HOLDER_A = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as Address
const HOLDER_B = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' as Address

const stubs = {
  UCard: { name: 'UCard', template: '<div data-test="u-card"><slot /></div>' },
  UAlert: {
    name: 'UAlert',
    props: ['color', 'title', 'description', 'variant', 'icon'],
    template:
      '<div :data-test-alert-title="title" v-bind="$attrs"><span>{{ description }}</span></div>'
  }
}

const migrationData: InvestorMigration = {
  id: 1,
  teamId: 1,
  previousInvestorAddress: '0x1111111111111111111111111111111111111111',
  newInvestorAddress: INVESTOR,
  merkleRoot: '0x2222222222222222222222222222222222222222222222222222222222222222',
  blockNumber: '42',
  shareholders: [
    { shareholder: HOLDER_A, amount: '100' },
    { shareholder: HOLDER_B, amount: '200' }
  ],
  proofs: { [HOLDER_A.toLowerCase()]: ['0xproofA'], [HOLDER_B.toLowerCase()]: ['0xproofB'] },
  createdAt: new Date().toISOString()
} as unknown as InvestorMigration

function mountSweep(props: { migrationData?: InvestorMigration } = {}) {
  return renderWithProviders(MigrationOwnerSweep, {
    props: {
      investorV2Address: INVESTOR,
      migrationData,
      ...props
    },
    global: { stubs }
  })
}

describe('MigrationOwnerSweep', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSweepState.isPending.value = false
    mockSweepState.isError.value = false
    mockSweepState.error.value = null
    mockCompletionState.isPending.value = false
    mockCompletionState.isError.value = false
    mockCompletionState.error.value = null
  })

  it('shows the shareholder count from the snapshot', async () => {
    const wrapper = mountSweep()
    await flushPromises()

    expect(wrapper.text()).toContain('Snapshot contains 2 shareholders')
  })

  it('dispatches sweep with every shareholder that has a proof', async () => {
    const wrapper = mountSweep()
    await flushPromises()

    await wrapper.find('[data-test="dispatch-button"]').trigger('click')

    expect(mockSweepState.mutate).toHaveBeenCalledTimes(1)
    const [args] = mockSweepState.mutate.mock.calls[0]
    expect(args).toEqual({
      investorV2Address: INVESTOR,
      holders: [HOLDER_A, HOLDER_B],
      amounts: [100n, 200n],
      proofs: [['0xproofA'], ['0xproofB']]
    })
  })

  it('toasts success once the sweep mutation resolves', async () => {
    mockSweepState.mutate.mockImplementation((_vars, opts?: { onSuccess?: () => void }) => {
      opts?.onSuccess?.()
    })

    const wrapper = mountSweep()
    await flushPromises()

    await wrapper.find('[data-test="dispatch-button"]').trigger('click')

    const [, options] = mockSweepState.mutate.mock.calls[0]
    expect(options.onSuccess).toBeTypeOf('function')
  })

  it('toasts success once the completion mutation resolves', async () => {
    mockCompletionState.mutate.mockImplementation((_address, opts?: { onSuccess?: () => void }) => {
      opts?.onSuccess?.()
    })

    const wrapper = mountSweep()
    await flushPromises()

    await wrapper.find('[data-test="complete-migration-button"]').trigger('click')

    const [, options] = mockCompletionState.mutate.mock.calls[0]
    expect(options.onSuccess).toBeTypeOf('function')
  })

  it('disables dispatch when no shareholder in the snapshot has a proof', async () => {
    const wrapper = mountSweep({
      migrationData: { ...migrationData, proofs: {} } as unknown as InvestorMigration
    })
    await flushPromises()

    const button = wrapper.findComponent('[data-test="dispatch-button"]')
    expect(button.props('disabled')).toBe(true)
  })

  it('calls completion.mutate on complete migration click', async () => {
    const wrapper = mountSweep()
    await flushPromises()

    await wrapper.find('[data-test="complete-migration-button"]').trigger('click')

    expect(mockCompletionState.mutate).toHaveBeenCalledWith(
      INVESTOR,
      expect.objectContaining({ onSuccess: expect.any(Function) })
    )
  })

  it('renders the inline error alert when the sweep fails', async () => {
    mockSweepState.isError.value = true
    mockSweepState.error.value = new Error('bulkClaim reverted')

    const wrapper = mountSweep()
    await flushPromises()

    expect(wrapper.find('[data-test="migration-owner-error"]').exists()).toBe(true)
  })

  it('renders the inline error alert when completion fails', async () => {
    mockCompletionState.isError.value = true
    mockCompletionState.error.value = new Error('completeMigration reverted')

    const wrapper = mountSweep()
    await flushPromises()

    expect(wrapper.find('[data-test="migration-owner-error"]').exists()).toBe(true)
  })

  it('shows the dispatch button in a loading state while sweeping', async () => {
    mockSweepState.isPending.value = true

    const wrapper = mountSweep()
    await flushPromises()

    const button = wrapper.findComponent('[data-test="dispatch-button"]')
    expect(button.props('loading')).toBe(true)
    expect(button.props('disabled')).toBe(true)
  })
})
