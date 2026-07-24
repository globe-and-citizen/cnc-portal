import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import CompaniesTable from '@/components/sections/CompaniesView/CompaniesTable.vue'
import { mockUserStore } from '@/tests/mocks'
import type { Team } from '@/types'

const OWNER = '0x0000000000000000000000000000000000000099'

function makeTeam(id: string, ownerAddress: string, overrides: Partial<Team> = {}): Team {
  return {
    id,
    name: `Company ${id}`,
    description: `Description for company ${id}`,
    isHidden: false,
    isArchived: false,
    members: [
      { id: `${id}-m1`, name: 'Alice', address: '0xaa', teamId: Number(id) },
      { id: `${id}-m2`, name: 'Bob', address: '0xbb', teamId: Number(id) }
    ],
    ownerAddress: ownerAddress as Team['ownerAddress'],
    teamContracts: [],
    ...overrides
  }
}

function mountTable(teams: Team[]) {
  return mount(CompaniesTable, { props: { teams } })
}

type MenuItem = { label: string; onSelect?: () => void }

const dropdownItems = (wrapper: ReturnType<typeof mountTable>, index: number): MenuItem[] =>
  wrapper.findAllComponents({ name: 'UDropdown' })[index].props('items') as MenuItem[]

describe('CompaniesTable', () => {
  it('renders the table shell', () => {
    mockUserStore.address = OWNER
    const wrapper = mountTable([makeTeam('1', OWNER)])
    expect(wrapper.find('[data-test="companies-table"]').exists()).toBe(true)
  })

  it('renders one row per team carrying its teamId', () => {
    mockUserStore.address = OWNER
    const wrapper = mountTable([makeTeam('1', OWNER), makeTeam('2', '0xother')])
    const rows = wrapper.findAll('[data-test="table-row"]')
    expect(rows).toHaveLength(2)
    expect(rows[0].attributes('data-team-id')).toBe('1')
    expect(rows[1].attributes('data-team-id')).toBe('2')
  })

  it('shows the role badge and treasury balance for each row', () => {
    mockUserStore.address = OWNER
    const wrapper = mountTable([makeTeam('1', OWNER), makeTeam('2', '0xother')])
    const badges = wrapper.findAll('[data-test="role-badge"]')
    expect(badges[0].attributes('data-role')).toBe('owner')
    expect(badges[1].attributes('data-role')).toBe('employee')
    // Treasury labels come from useTeamsTreasury and are formatted as USD.
    expect(wrapper.text()).toContain('$')
  })

  it('emits `open` with the teamId when a row is clicked', async () => {
    mockUserStore.address = OWNER
    const wrapper = mountTable([makeTeam('7', OWNER)])
    await wrapper.find('[data-test="table-row"]').trigger('click')
    expect(wrapper.emitted('open')?.[0]).toEqual(['7'])
  })

  it('exposes the four owner actions on an owned company', () => {
    mockUserStore.address = OWNER
    const wrapper = mountTable([makeTeam('1', OWNER)])
    expect(dropdownItems(wrapper, 0).map((item) => item.label)).toEqual([
      'Update',
      'Archive',
      'Hide',
      'Delete'
    ])
  })

  it('exposes only Hide on a company the user does not own', () => {
    mockUserStore.address = OWNER
    const wrapper = mountTable([makeTeam('1', '0xother')])
    expect(dropdownItems(wrapper, 0).map((item) => item.label)).toEqual(['Hide'])
  })

  it('emits `action` with teamId + action when a menu item is selected', () => {
    mockUserStore.address = OWNER
    const wrapper = mountTable([makeTeam('5', OWNER)])
    const items = dropdownItems(wrapper, 0)
    items.find((item) => item.label === 'Archive')?.onSelect?.()
    expect(wrapper.emitted('action')?.[0]).toEqual([{ teamId: '5', action: 'archive' }])
  })

  it('does not navigate when the kebab trigger is clicked', async () => {
    mockUserStore.address = OWNER
    const wrapper = mountTable([makeTeam('1', OWNER)])
    await wrapper.find('[data-test="row-kebab"]').trigger('click')
    expect(wrapper.emitted('open')).toBeUndefined()
  })

  it('paginates client-side, slicing rows beyond the page size', () => {
    mockUserStore.address = OWNER
    const teams = Array.from({ length: 12 }, (_, i) => makeTeam(String(i + 1), OWNER))
    const wrapper = mountTable(teams)
    // Default page size is 10, so the first page shows 10 of 12 rows.
    expect(wrapper.findAll('[data-test="table-row"]')).toHaveLength(10)
    expect(wrapper.find('[data-test="companies-table-pagination"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('12')
  })
})
