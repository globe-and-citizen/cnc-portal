import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import TeamCard from '@/components/sections/TeamView/TeamCard.vue'
import { mockUserStore } from '@/tests/mocks'
import type { Member, Team } from '@/types'

// `@/stores/user` is globally mocked; `useUserDataStore()` (used directly and
// inside `useTeamsTreasury`) returns the shared `mockUserStore`. We drive the
// current-user identity by mutating `mockUserStore.address`. A global beforeEach
// resets it between tests, so no createTestingPinia is needed here.
const USER_ADDRESS = '0x4b6Bf5cD91446408290725879F5666dcd9785F62'
const OTHER_ADDRESS = '0x0000000000000000000000000000000000000099'

function makeMember(overrides: Partial<Member> = {}): Member {
  return { id: '1', name: 'Alice', address: USER_ADDRESS, teamId: 1, ...overrides }
}

function makeTeam(overrides: Partial<Team> = {}): Team {
  return {
    id: '1',
    name: 'Team A',
    description: 'This is a description of Team A.',
    members: [],
    ownerAddress: OTHER_ADDRESS,
    teamContracts: [],
    isHidden: false,
    isArchived: false,
    ...overrides
  } as Team
}

function render(team: Team) {
  return mount(TeamCard, { props: { team } })
}

const menuItem = (wrapper: ReturnType<typeof render>, action: string) =>
  wrapper.find(`[data-test="u-dropdown"] [data-test="card-menu-${action}"]`)

async function openMenu(wrapper: ReturnType<typeof render>) {
  await wrapper.find('[data-test="card-kebab"]').trigger('click')
}

describe('TeamCard', () => {
  beforeEach(() => {
    mockUserStore.address = USER_ADDRESS
  })

  describe('Render', () => {
    it('renders the root', () => {
      expect(render(makeTeam()).find('[data-test="team-card"]').exists()).toBe(true)
    })

    it('displays the team name and description', () => {
      const wrapper = render(makeTeam())
      expect(wrapper.text()).toContain('Team A')
      expect(wrapper.text()).toContain('This is a description of Team A.')
    })

    it('renders the balance label as a formatted USD amount', () => {
      const balance = render(makeTeam()).find('[data-test="card-balance"]')
      expect(balance.exists()).toBe(true)
      expect(balance.text()).toMatch(/^\$[\d,]+\.\d{2}$/)
    })

    it('renders a member count in the footer', () => {
      const team = makeTeam({ members: [makeMember(), makeMember({ id: '2', address: '0xabc' })] })
      expect(render(team).find('[data-test="card-members"]').text()).toContain('2 members')
    })
  })

  describe('Role', () => {
    it('shows the Owner role when the current user owns the team', () => {
      const wrapper = render(makeTeam({ ownerAddress: USER_ADDRESS }))
      expect(wrapper.find('[data-test="role-badge"]').attributes('data-role')).toBe('owner')
    })

    it('shows the Employee role when the current user is not the owner', () => {
      const wrapper = render(makeTeam())
      expect(wrapper.find('[data-test="role-badge"]').attributes('data-role')).toBe('employee')
    })
  })

  describe('Kebab menu', () => {
    it('exposes all four actions for an owner', async () => {
      const wrapper = render(makeTeam({ ownerAddress: USER_ADDRESS }))
      await openMenu(wrapper)
      for (const action of ['update', 'archive', 'hide', 'delete']) {
        expect(menuItem(wrapper, action).exists()).toBe(true)
      }
    })

    it('exposes only Hide for an employee', async () => {
      const wrapper = render(makeTeam())
      await openMenu(wrapper)
      expect(menuItem(wrapper, 'hide').exists()).toBe(true)
      for (const action of ['update', 'archive', 'delete']) {
        expect(menuItem(wrapper, action).exists()).toBe(false)
      }
    })

    it('emits an action event with the team id and chosen action', async () => {
      const wrapper = render(makeTeam({ id: '7', ownerAddress: USER_ADDRESS }))
      await openMenu(wrapper)
      await menuItem(wrapper, 'archive').trigger('click')
      expect(wrapper.emitted('action')?.[0]).toEqual([{ teamId: '7', action: 'archive' }])
    })

    it('emits delete with the right payload', async () => {
      const wrapper = render(makeTeam({ id: '9', ownerAddress: USER_ADDRESS }))
      await openMenu(wrapper)
      await menuItem(wrapper, 'delete').trigger('click')
      expect(wrapper.emitted('action')?.[0]).toEqual([{ teamId: '9', action: 'delete' }])
    })

    it('stops a menu-action click from reaching the card click handler', async () => {
      const onCardClick = vi.fn()
      const Harness = defineComponent({
        setup() {
          return () =>
            h(TeamCard, { team: makeTeam({ ownerAddress: USER_ADDRESS }), onClick: onCardClick })
        }
      })
      const wrapper = mount(Harness)
      await wrapper.find('[data-test="card-kebab"]').trigger('click')
      await wrapper.find('[data-test="card-menu-hide"]').trigger('click')
      expect(onCardClick).not.toHaveBeenCalled()
    })
  })

  describe('Wage chip', () => {
    it('shows the weekly wage when the current user has a wage set', () => {
      const member = makeMember({
        currentWage: {
          id: 1,
          teamId: 1,
          userAddress: USER_ADDRESS,
          ratePerHour: [{ type: 'usdc', amount: 25 }],
          maximumHoursPerWeek: 40,
          disabled: false,
          nextWageId: null,
          createdAt: '',
          updatedAt: ''
        }
      })
      const chip = render(makeTeam({ members: [member] })).find('[data-test="card-wage"]')
      expect(chip.text()).toContain('Wage set')
      expect(chip.text()).toContain('$1,000.00/week')
    })

    it('shows a no-wage chip when the current user has no wage', () => {
      const chip = render(makeTeam({ members: [makeMember()] })).find('[data-test="card-wage"]')
      expect(chip.text()).toContain('No wage set')
    })
  })
})
