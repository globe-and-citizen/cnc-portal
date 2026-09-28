import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { type Address, type Hex } from 'viem'
import MigrationOwnerSweep from '../MigrationOwnerSweep.vue'
import {
  useCompleteMigrationMutation,
  useSweepMigrationMutation
} from '@/composables/investor/useSweepMigration'
import type { InvestorMigration } from '@/queries/investorMigration.queries'
import { mockToast, renderWithProviders } from '@/tests/mocks'

vi.mock('@/composables/investor/useSweepMigration', () => ({
  useSweepMigrationMutation: vi.fn(),
  useCompleteMigrationMutation: vi.fn()
}))

const INVESTOR_ADDRESS = '0x4234567890123456789012345678901234567890' as Address
const FIRST_HOLDER = '0x1111111111111111111111111111111111111111' as Address
const SECOND_HOLDER = '0x2222222222222222222222222222222222222222' as Address
const FIRST_PROOF = [`0x${'3'.repeat(64)}` as Hex]
const SECOND_PROOF = [`0x${'4'.repeat(64)}` as Hex]

const migrationData: InvestorMigration = {
  id: 1,
  teamId: 1,
  previousInvestorAddress: SECOND_HOLDER,
  newInvestorAddress: INVESTOR_ADDRESS,
  merkleRoot: `0x${'1'.repeat(64)}`,
  blockNumber: '42',
  shareholders: [
    { shareholder: FIRST_HOLDER, amount: '1000000' },
    { shareholder: SECOND_HOLDER, amount: '2500000' }
  ],
  proofs: {
    [FIRST_HOLDER.toLowerCase()]: FIRST_PROOF,
    [SECOND_HOLDER.toLowerCase()]: SECOND_PROOF
  },
  createdAt: '2026-09-28T00:00:00.000Z'
}

const sweep = {
  mutate: vi.fn(),
  isPending: ref(false),
  isError: ref(false),
  error: ref<Error | null>(null)
}

const completion = {
  mutate: vi.fn(),
  isPending: ref(false),
  isError: ref(false),
  error: ref<Error | null>(null)
}

const createWrapper = (data: InvestorMigration = migrationData) =>
  renderWithProviders(MigrationOwnerSweep, {
    props: { investorAddress: INVESTOR_ADDRESS, migrationData: data },
    global: {
      stubs: {
        TeamArchivedTooltip: {
          name: 'TeamArchivedTooltip',
          template: '<div><slot :disabled="false" /></div>'
        }
      }
    }
  })

describe('MigrationOwnerSweep', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sweep.isPending.value = false
    sweep.isError.value = false
    sweep.error.value = null
    completion.isPending.value = false
    completion.isError.value = false
    completion.error.value = null
    vi.mocked(useSweepMigrationMutation).mockReturnValue(sweep as never)
    vi.mocked(useCompleteMigrationMutation).mockReturnValue(completion as never)
  })

  it('[AC-US-SHER-007-04] dispatches every snapshot allocation with its matching proof', async () => {
    const wrapper = createWrapper()

    await wrapper.find('[data-test="dispatch-button"]').trigger('click')

    expect(sweep.mutate).toHaveBeenCalledWith(
      {
        investorAddress: INVESTOR_ADDRESS,
        holders: [FIRST_HOLDER, SECOND_HOLDER],
        amounts: [1000000n, 2500000n],
        proofs: [FIRST_PROOF, SECOND_PROOF]
      },
      expect.objectContaining({ onSuccess: expect.any(Function) })
    )
  })

  it('[AC-US-SHER-007-02] submits migration completion separately', async () => {
    const wrapper = createWrapper()

    await wrapper.find('[data-test="complete-migration-button"]').trigger('click')

    expect(completion.mutate).toHaveBeenCalledWith(
      INVESTOR_ADDRESS,
      expect.objectContaining({ onSuccess: expect.any(Function) })
    )
    expect(sweep.mutate).not.toHaveBeenCalled()
  })

  it('[AC-US-SHER-007-07] prevents dispatch when the snapshot has no usable proof', async () => {
    const wrapper = createWrapper({ ...migrationData, proofs: {} })
    const dispatchButton = wrapper.find('[data-test="dispatch-button"]')

    expect(dispatchButton.attributes('disabled')).toBeDefined()
    await dispatchButton.trigger('click')
    expect(sweep.mutate).not.toHaveBeenCalled()
  })

  it('[AC-US-SHER-007-08] keeps a failed owner action visible without reporting success', () => {
    sweep.isError.value = true
    sweep.error.value = new Error('dispatch rejected')

    const wrapper = createWrapper()

    expect(wrapper.find('[data-test="migration-owner-error"]').text()).toContain(
      'dispatch rejected'
    )
    expect(mockToast.add).not.toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Claims dispatched!' })
    )
  })
})
