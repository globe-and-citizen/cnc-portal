import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import type { Address } from 'viem'
import SafeHistoryCard from '../SafeHistoryCard.vue'
import { createMockMutationResponse, mockTeamData, mockTeamStore } from '@/tests/mocks'
import { makeTokenBalance, mockUseContractBalance } from '@/tests/mocks/composables.mock'
import { useUpdateTeamSafeMutation } from '@/queries/contract.queries'

const DEFAULT_SAFE = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
const PREVIOUS_SAFE = '0xcccccccccccccccccccccccccccccccccccccccc'
const REMOVED_SAFE = '0xdddddddddddddddddddddddddddddddddddddddd'

let wrapper: VueWrapper | undefined
let mutation: ReturnType<typeof createMockMutationResponse>

function mountCard(canManage = true) {
  wrapper = mount(SafeHistoryCard, {
    props: { canManage },
    global: { stubs: { AddressTooltip: true } }
  })
  return wrapper
}

const safe = (address: string, activatedAt: string, removedAt: string | null = null) => ({
  address: address as Address,
  type: 'Safe' as const,
  deployer: mockTeamData.ownerAddress,
  admins: [],
  activatedAt,
  removedAt
})

const statuses = (card: VueWrapper) =>
  card.findAll('[data-test="safe-history-status"]').map((badge) => badge.text())

describe('[US-SAFE-001] SafeHistoryCard', () => {
  beforeEach(() => {
    mutation = createMockMutationResponse()
    vi.mocked(useUpdateTeamSafeMutation).mockReturnValue(mutation as never)
    mockTeamStore.currentTeamId = '1'
    mockTeamStore.currentTeam = {
      ...mockTeamData,
      teamContracts: [
        ...mockTeamData.teamContracts,
        safe(REMOVED_SAFE, '2025-06-01T00:00:00Z', '2025-12-01T00:00:00Z'),
        safe(DEFAULT_SAFE, '2026-10-01T00:00:00Z'),
        safe(PREVIOUS_SAFE, '2026-01-01T00:00:00Z')
      ]
    }
    mockTeamStore.currentTeamMeta.data.isArchived = false
    mockUseContractBalance.balances.value = []
  })

  afterEach(() => wrapper?.unmount())

  it('[AC-US-SAFE-001-15] lists every Safe of the team with its status', () => {
    const card = mountCard(false)

    expect(statuses(card)).toEqual(['Default', 'Previous', 'Removed'])
    expect(card.find('[data-test="safe-set-default-button"]').exists()).toBe(false)
    expect(card.find('[data-test="safe-remove-button"]').exists()).toBe(false)
  })

  it('[AC-US-SAFE-001-14] hides the owner actions when the team is archived', () => {
    mockTeamStore.currentTeamMeta.data.isArchived = true
    const card = mountCard()

    expect(card.find('[data-test="safe-set-default-button"]').exists()).toBe(false)
  })

  it('[AC-US-SAFE-001-16] makes a previous Safe the default after confirmation', async () => {
    const card = mountCard()

    await card.findAll('[data-test="safe-set-default-button"]')[0]!.trigger('click')
    await flushPromises()
    await card.find('[data-test="safe-action-confirm"]').trigger('click')

    expect(mutation.mutate).toHaveBeenCalledWith(
      {
        body: {
          teamId: 1,
          contractAddress: expect.stringMatching(new RegExp(PREVIOUS_SAFE, 'i')),
          action: 'default'
        }
      },
      expect.any(Object)
    )
  })

  it('[AC-US-SAFE-001-17] removes the default Safe after confirmation', async () => {
    const card = mountCard()

    await card.findAll('[data-test="safe-remove-button"]')[0]!.trigger('click')
    await flushPromises()
    await card.find('[data-test="safe-action-confirm"]').trigger('click')

    expect(mutation.mutate).toHaveBeenCalledWith(
      {
        body: {
          teamId: 1,
          contractAddress: expect.stringMatching(new RegExp(DEFAULT_SAFE, 'i')),
          action: 'remove'
        }
      },
      expect.any(Object)
    )
  })

  it('[AC-US-SAFE-001-18] warns before a switch when the default Safe still holds tokens', async () => {
    mockUseContractBalance.balances.value = [
      makeTokenBalance({ token: { name: 'USD Coin', symbol: 'USDC' }, amount: 12, usdPrice: 1 }),
      makeTokenBalance({ token: { name: 'Polygon', symbol: 'POL' }, amount: 0, usdPrice: 0.2 })
    ]
    const card = mountCard()

    await card.findAll('[data-test="safe-set-default-button"]')[0]!.trigger('click')
    await flushPromises()

    const warning = card.find('[data-test="safe-held-tokens-warning"]')
    expect(warning.exists()).toBe(true)
    expect(warning.text()).toContain('USDC')
    expect(warning.text()).not.toContain('POL')
  })

  it('does not warn when removing a Safe that is not the default', async () => {
    mockUseContractBalance.balances.value = [
      makeTokenBalance({ token: { name: 'USD Coin', symbol: 'USDC' }, amount: 12, usdPrice: 1 })
    ]
    const card = mountCard()

    await card.findAll('[data-test="safe-remove-button"]')[1]!.trigger('click')
    await flushPromises()

    expect(card.find('[data-test="safe-held-tokens-warning"]').exists()).toBe(false)
  })

  it('shows the actions the page passes in its header', () => {
    wrapper = mount(SafeHistoryCard, {
      props: { canManage: true },
      slots: { actions: '<button data-test="page-action">Add</button>' },
      global: { stubs: { AddressTooltip: true } }
    })

    expect(wrapper.find('[data-test="page-action"]').exists()).toBe(true)
  })
})
