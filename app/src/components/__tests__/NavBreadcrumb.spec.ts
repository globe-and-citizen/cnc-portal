import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import NavBreadcrumb from '@/components/NavBreadcrumb.vue'
import { mockTeamData } from '@/tests/mocks/index'
import { mockTeamStore } from '@/tests/mocks/store.mock'
import { setMockRoute } from '@/tests/mocks/router.mock'

// UBreadcrumb (auto-imported) renders the real component, so we assert on its output.
describe('NavBreadcrumb', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows [team name] > [page] when viewing a team', () => {
    // Default mock route: params.id = '1', meta.name = 'Team View'
    const wrapper = mount(NavBreadcrumb)

    expect(wrapper.text()).toContain(mockTeamData.name) // 'Test Team'
    expect(wrapper.text()).toContain('Team View')
  })

  it('shows only the page label on the Companies list (no team selected)', () => {
    setMockRoute({ name: 'teams', params: {}, path: '/teams', meta: { name: 'Companies' } })

    const wrapper = mount(NavBreadcrumb)

    expect(wrapper.text()).toContain('Companies')
    expect(wrapper.text()).not.toContain(mockTeamData.name)
  })

  it('renders a skeleton placeholder while the team is loading', () => {
    mockTeamStore.currentTeamMeta = { isPending: true, data: undefined } as never

    const wrapper = mount(NavBreadcrumb)

    expect(wrapper.find('[data-test="loader"]').exists()).toBe(true)
  })
})
