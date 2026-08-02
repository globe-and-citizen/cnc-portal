import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import TeamCard from '@/components/sections/TeamView/TeamCard.vue'
import { useCurrencyStore } from '@/stores/currencyStore'
import { makeCurrencyStoreMock, mockUserStore } from '@/tests/mocks'
import { UDropdownStub } from '@/tests/stubs/nuxt-ui.stubs'
import type { Team } from '@/types'
import type { Address } from 'viem'

// `makeCurrencyStoreMock` exposes `localCurrency` unwrapped (as a real Pinia
// store does) and is the shape the card reads; it has no `getTokenInfo`, which
// the wage conversion needs, so add a priced one: 1 USDC = $1, 1 native = $2000.
const mockCurrencyStore = {
  ...makeCurrencyStoreMock(),
  getTokenInfo: vi.fn((tokenId: string) => ({
    id: tokenId,
    prices: [{ id: 'local', price: tokenId === 'native' ? 2000 : 1, code: 'USD', symbol: '$' }]
  }))
}

beforeEach(() => {
  vi.mocked(useCurrencyStore).mockReturnValue(
    mockCurrencyStore as unknown as ReturnType<typeof useCurrencyStore>
  )
})

const OWNER = '0x0000000000000000000000000000000000000001' as Address
const OUTSIDER = '0x4b6Bf5cD91446408290725879F5666dcd9785F62' as Address

const makeTeam = (overrides: Partial<Team> = {}): Team =>
  ({
    id: '1',
    name: 'Team A',
    slug: 'team-a',
    description: 'This is a description of Team A.',
    isHidden: false,
    isArchived: false,
    members: [],
    ownerAddress: OWNER,
    teamContracts: [],
    ...overrides
  }) as Team

const mountCard = (team: Team = makeTeam()) => mount(TeamCard, { props: { team } })

describe('TeamCard', () => {
  describe('Identity', () => {
    it('renders the team name and description', () => {
      const wrapper = mountCard()

      expect(wrapper.find('[data-test="team-name"]').text()).toBe('Team A')
      expect(wrapper.find('[data-test="team-desc"]').text()).toBe(
        'This is a description of Team A.'
      )
    })

    it('shows the Owner badge when the current user owns the team', () => {
      expect(mountCard().text()).toContain('Owner')
    })

    it('shows the Employee badge when the current user is not the owner', () => {
      const wrapper = mountCard(makeTeam({ ownerAddress: OUTSIDER }))

      expect(wrapper.text()).toContain('Employee')
      expect(wrapper.text()).not.toContain('Owner')
    })

    it('flags a team whose Officer is on an older contract generation', () => {
      const wrapper = mountCard(
        makeTeam({
          currentOfficer: { address: OUTSIDER } as Team['currentOfficer'],
          isMigrated: false
        })
      )

      expect(wrapper.find('[data-test="team-legacy-badge"]').exists()).toBe(true)
    })

    it('does not flag an onboarding team that has no Officer yet', () => {
      const wrapper = mountCard(makeTeam({ isMigrated: false }))

      expect(wrapper.find('[data-test="team-legacy-badge"]').exists()).toBe(false)
    })
  })

  describe('Treasury', () => {
    // Every account resolves to the shared useContractBalance mock ($50.5K),
    // so four funded accounts total $202,000 and each holds a quarter.
    it('totals the balance across the four team accounts', () => {
      const wrapper = mountCard()

      expect(wrapper.find('[data-test="total-balance"]').text()).toBe('$202,000.00')
    })

    it('breaks the balance down into one legend entry per funded account', () => {
      const text = mountCard().text()

      expect(text).toContain('Bank 25%')
      expect(text).toContain('Safe 25%')
      expect(text).toContain('Expense 25%')
      expect(text).toContain('Cash 25%')
    })

    it('renders a bar segment per funded account', () => {
      const segments = mountCard().find('[data-test="account-bar"]').element.children

      expect(segments).toHaveLength(4)
    })
  })

  describe('Roster', () => {
    it('uses the authoritative member count over the members it was sent', () => {
      const wrapper = mountCard(
        makeTeam({
          members: [{ name: 'Mary Kay', address: OWNER }] as Team['members'],
          _count: { members: 8 }
        })
      )

      expect(wrapper.find('[data-test="member-count"]').text()).toBe('8 members')
      expect(wrapper.find('[data-test="member-overflow"]').text()).toBe('+7')
    })

    it('renders member initials and caps the avatar stack at three', () => {
      const wrapper = mountCard(
        makeTeam({
          members: [
            { name: 'Mary Kay', address: '0xaa' },
            { name: 'Ada Devine', address: '0xbb' },
            { name: 'Jo Rivers', address: '0xcc' },
            { name: 'Zed Last', address: '0xdd' }
          ] as Team['members'],
          _count: { members: 4 }
        })
      )

      const text = wrapper.text()
      expect(text).toContain('MK')
      expect(text).toContain('AD')
      expect(text).toContain('JR')
      expect(text).not.toContain('ZL')
      expect(wrapper.find('[data-test="member-overflow"]').text()).toBe('+1')
    })

    it('singularises the label for a one-person team', () => {
      const wrapper = mountCard(makeTeam({ _count: { members: 1 } }))

      expect(wrapper.find('[data-test="member-count"]').text()).toBe('1 member')
    })

    it('omits the overflow badge when every member is shown', () => {
      const wrapper = mountCard(
        makeTeam({
          members: [{ name: 'Mary Kay', address: OWNER }] as Team['members'],
          _count: { members: 1 }
        })
      )

      expect(wrapper.find('[data-test="member-overflow"]').exists()).toBe(false)
    })
  })

  describe("Viewer's wage", () => {
    it('reports when the viewer has no wage on the team', () => {
      expect(mountCard().find('[data-test="wage-pill"]').text()).toBe('No wage set')
    })

    it('prices the hourly rates into a weekly figure', () => {
      const wrapper = mountCard(
        makeTeam({
          callerWage: {
            ratePerHour: [{ type: 'usdc', amount: 10 }],
            maximumHoursPerWeek: 40,
            disabled: false
          } as Team['callerWage']
        })
      )

      expect(wrapper.find('[data-test="wage-pill"]').text()).toBe('Wage set · $400 / week')
    })

    it('sums rates across every priced token', () => {
      const wrapper = mountCard(
        makeTeam({
          callerWage: {
            ratePerHour: [
              { type: 'usdc', amount: 10 },
              { type: 'native', amount: 0.01 }
            ],
            maximumHoursPerWeek: 10,
            disabled: false
          } as Team['callerWage']
        })
      )

      // (10 x $1) + (0.01 x $2000) = $30/h over 10h
      expect(wrapper.find('[data-test="wage-pill"]').text()).toBe('Wage set · $300 / week')
    })

    it('distinguishes a paused wage from an absent one', () => {
      const wrapper = mountCard(
        makeTeam({
          callerWage: {
            ratePerHour: [{ type: 'usdc', amount: 10 }],
            maximumHoursPerWeek: 40,
            disabled: true
          } as Team['callerWage']
        })
      )

      expect(wrapper.find('[data-test="wage-pill"]').text()).toBe('Wage paused')
    })
  })

  describe('Actions', () => {
    const menuItems = (team: Team) =>
      mountCard(team).findComponent(UDropdownStub).props('items') as Array<{
        label: string
        onSelect: () => void
      }>

    it('offers the full management menu to an owner', () => {
      expect(menuItems(makeTeam()).map((item) => item.label)).toEqual([
        'Update',
        'Archive',
        'Hide',
        'Delete'
      ])
    })

    it('lets a non-owner only drop the team from their own list', () => {
      expect(menuItems(makeTeam({ ownerAddress: OUTSIDER })).map((item) => item.label)).toEqual([
        'Hide'
      ])
    })

    // The whole card is the navigation target, so a click meant for the menu
    // must not also open the team.
    it('keeps menu clicks from reaching the card underneath', async () => {
      const onCardClick = vi.fn()
      const wrapper = mount(TeamCard, {
        props: { team: makeTeam() },
        attrs: { onClick: onCardClick }
      })

      await wrapper.find('[data-test="u-dropdown"]').trigger('click')
      expect(onCardClick).not.toHaveBeenCalled()

      // …while a click anywhere else on the card still navigates.
      await wrapper.trigger('click')
      expect(onCardClick).toHaveBeenCalledTimes(1)
    })

    it('emits the chosen action instead of mutating the team itself', () => {
      const wrapper = mountCard()
      const items = wrapper.findComponent(UDropdownStub).props('items') as Array<{
        label: string
        onSelect: () => void
      }>

      items.find((item) => item.label === 'Archive')?.onSelect()

      expect(wrapper.emitted('archive')).toHaveLength(1)
      expect(wrapper.emitted('delete')).toBeUndefined()
    })
  })

  describe('Store wiring', () => {
    it('re-reads ownership from the user store rather than caching it', () => {
      mockUserStore.address = OUTSIDER

      expect(mountCard().text()).toContain('Employee')
    })
  })
})
