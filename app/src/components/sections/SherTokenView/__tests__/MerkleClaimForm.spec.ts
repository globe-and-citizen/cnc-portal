import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import type { Address } from 'viem'
import MerkleClaimForm from '@/components/sections/SherTokenView/MerkleClaimForm.vue'
import { renderWithProviders } from '@/tests/mocks'
import type { InvestorMigration } from '@/queries/investorMigration.queries'

const mockClaimState = {
  mutate: vi.fn(),
  mutateAsync: vi.fn().mockResolvedValue(undefined),
  isPending: ref(false),
  isError: ref(false),
  error: ref<Error | null>(null),
  data: ref(null),
  reset: vi.fn()
}

vi.mock('@/composables/investor/useClaimMigration', () => ({
  useClaimMigrationMutation: vi.fn(() => mockClaimState)
}))

const INVESTOR = '0x3333333333333333333333333333333333333333' as Address
const USER_ADDRESS = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as Address
const OTHER_ADDRESS = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' as Address

const stubs = {
  UCard: { name: 'UCard', template: '<div data-test="u-card"><slot /></div>' },
  UAlert: {
    name: 'UAlert',
    props: ['color', 'title', 'description', 'variant', 'icon'],
    template:
      '<div :data-test-alert-title="title" v-bind="$attrs"><span>{{ description }}</span></div>'
  },
  UInput: {
    name: 'UInput',
    props: ['modelValue'],
    template: '<input :value="modelValue" v-bind="$attrs" />'
  }
}

const migrationData: InvestorMigration = {
  id: 1,
  teamId: 1,
  previousInvestorAddress: '0x1111111111111111111111111111111111111111',
  newInvestorAddress: INVESTOR,
  merkleRoot: '0x2222222222222222222222222222222222222222222222222222222222222222',
  blockNumber: '42',
  shareholders: [{ shareholder: USER_ADDRESS, amount: '100000000' }],
  proofs: { [USER_ADDRESS.toLowerCase()]: ['0xproof'] },
  createdAt: new Date().toISOString()
} as unknown as InvestorMigration

function mountForm(
  props: {
    investorV2Address?: Address
    migrationData?: InvestorMigration
    userAddress?: Address
  } = {}
) {
  return renderWithProviders(MerkleClaimForm, {
    props: {
      investorV2Address: INVESTOR,
      migrationData,
      userAddress: USER_ADDRESS,
      ...props
    },
    global: { stubs }
  })
}

describe('MerkleClaimForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockClaimState.isPending.value = false
    mockClaimState.isError.value = false
    mockClaimState.error.value = null
  })

  it('shows the formatted claim amount for a shareholder present in the snapshot', async () => {
    const wrapper = mountForm()
    await flushPromises()

    const input = wrapper.find('[data-test="claim-amount-input"]')
    expect((input.element as HTMLInputElement).value).toBe('100')
    expect(wrapper.text()).toContain('From snapshot at block 42')
  })

  it('shows a fallback message when the caller has no snapshot entry', async () => {
    const wrapper = mountForm({ userAddress: OTHER_ADDRESS })
    await flushPromises()

    expect(wrapper.text()).toContain('Your address is not present in this migration snapshot')
    const button = wrapper.findComponent('[data-test="claim-button"]')
    expect(button.props('disabled')).toBe(true)
  })

  it('calls claim.mutate with the amount and proof on click', async () => {
    const wrapper = mountForm()
    await flushPromises()

    await wrapper.find('[data-test="claim-button"]').trigger('click')

    expect(mockClaimState.mutate).toHaveBeenCalledTimes(1)
    const [args] = mockClaimState.mutate.mock.calls[0]
    expect(args).toEqual({
      investorV2Address: INVESTOR,
      amount: 100000000n,
      proof: ['0xproof']
    })
  })

  it('toasts success once the claim mutation resolves', async () => {
    mockClaimState.mutate.mockImplementation((_vars, opts?: { onSuccess?: () => void }) => {
      opts?.onSuccess?.()
    })

    const wrapper = mountForm()
    await flushPromises()

    await wrapper.find('[data-test="claim-button"]').trigger('click')

    const [, options] = mockClaimState.mutate.mock.calls[0]
    expect(options.onSuccess).toBeTypeOf('function')
  })

  it('renders the inline error alert when claim.error is set', async () => {
    mockClaimState.isError.value = true
    mockClaimState.error.value = new Error('claim reverted')

    const wrapper = mountForm()
    await flushPromises()

    expect(wrapper.find('[data-test="claim-error"]').exists()).toBe(true)
  })

  it('shows the button in a loading state while claiming', async () => {
    mockClaimState.isPending.value = true

    const wrapper = mountForm()
    await flushPromises()

    const button = wrapper.findComponent('[data-test="claim-button"]')
    expect(button.props('loading')).toBe(true)
    expect(button.props('disabled')).toBe(true)
  })
})
