import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { type Address, type Hex } from 'viem'
import MerkleClaimForm from '../MerkleClaimForm.vue'
import { useClaimMigrationMutation } from '@/composables/investor/useClaimMigration'
import type { InvestorMigration } from '@/queries/investorMigration.queries'
import { mockToast, renderWithProviders } from '@/tests/mocks'

vi.mock('@/composables/investor/useClaimMigration', () => ({
  useClaimMigrationMutation: vi.fn()
}))

const INVESTOR_ADDRESS = '0x4234567890123456789012345678901234567890' as Address
const SHAREHOLDER = '0x1111111111111111111111111111111111111111' as Address
const OUTSIDER = '0x2222222222222222222222222222222222222222' as Address
const PROOF = [`0x${'2'.repeat(64)}` as Hex]

const migrationData: InvestorMigration = {
  id: 1,
  teamId: 1,
  previousInvestorAddress: OUTSIDER,
  newInvestorAddress: INVESTOR_ADDRESS,
  merkleRoot: `0x${'1'.repeat(64)}`,
  blockNumber: '42',
  shareholders: [{ shareholder: SHAREHOLDER, amount: '1500000' }],
  proofs: { [SHAREHOLDER.toLowerCase()]: PROOF },
  createdAt: '2026-09-28T00:00:00.000Z'
}

const mutation = {
  mutate: vi.fn(),
  isPending: ref(false),
  isError: ref(false),
  error: ref<Error | null>(null)
}

const createWrapper = (userAddress: Address = SHAREHOLDER) =>
  renderWithProviders(MerkleClaimForm, {
    props: { investorAddress: INVESTOR_ADDRESS, migrationData, userAddress }
  })

describe('MerkleClaimForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mutation.isPending.value = false
    mutation.isError.value = false
    mutation.error.value = null
    vi.mocked(useClaimMigrationMutation).mockReturnValue(mutation as never)
  })

  it('[AC-US-SHER-006-01] submits the frozen allocation and proof for the connected shareholder', async () => {
    const wrapper = createWrapper()

    expect(
      (wrapper.find('[data-test="claim-amount-input"]').element as HTMLInputElement).value
    ).toBe('1.5')
    await wrapper.find('[data-test="claim-button"]').trigger('click')

    expect(mutation.mutate).toHaveBeenCalledWith(
      { investorAddress: INVESTOR_ADDRESS, amount: 1500000n, proof: PROOF },
      expect.objectContaining({ onSuccess: expect.any(Function) })
    )
  })

  it('[AC-US-SHER-006-06] prevents an address outside the snapshot from claiming', async () => {
    const wrapper = createWrapper(OUTSIDER)
    const claimButton = wrapper.find('[data-test="claim-button"]')

    expect(wrapper.text()).toContain('Your address is not present in this migration snapshot')
    expect(claimButton.attributes('disabled')).toBeDefined()
    await claimButton.trigger('click')
    expect(mutation.mutate).not.toHaveBeenCalled()
  })

  it('[AC-US-SHER-006-07] keeps a failed claim visible without reporting success', () => {
    mutation.isError.value = true
    mutation.error.value = new Error('claim rejected')

    const wrapper = createWrapper()

    expect(wrapper.find('[data-test="claim-error"]').text()).toContain('claim rejected')
    expect(mockToast.add).not.toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Shares claimed!' })
    )
  })
})
