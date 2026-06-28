import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import NavBreadcrumb from '@/components/NavBreadcrumb.vue'
import { mockTeamData } from '@/tests/mocks/index'
import { mockTeamStore, mockUserStore } from '@/tests/mocks/store.mock'
import { setMockRoute } from '@/tests/mocks/router.mock'

// A real (memory) router so UBreadcrumb's RouterLink-based crumbs can resolve.
// Component logic still reads the globally-mocked useRoute (mockRoute).
const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: '/teams', name: 'teams', component: { template: '<div />' } },
    { path: '/teams/:id', name: 'show-team', component: { template: '<div />' } }
  ]
})

const mountBreadcrumb = () => mount(NavBreadcrumb, { global: { plugins: [router] } })

describe('NavBreadcrumb', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows Companies / Team [role] / Page inside a team', () => {
    // Default mock route: params.id = '1', meta.name = 'Team View'.
    // mockUserStore.address differs from mockTeamData.ownerAddress → Employee.
    const text = mountBreadcrumb().text()
    expect(text).toContain('Companies')
    expect(text).toContain(mockTeamData.name) // 'Test Team'
    expect(text).toContain('Team View')
    expect(text).toContain('Employee')
  })

  it('links the Companies and team crumbs', () => {
    const wrapper = mountBreadcrumb()
    expect(wrapper.find('a[href="/teams"]').exists()).toBe(true)
    expect(wrapper.find('a[href="/teams/1"]').exists()).toBe(true)
  })

  it('marks the user as Owner when they own the team', () => {
    mockUserStore.address = mockTeamData.ownerAddress as string
    expect(mountBreadcrumb().text()).toContain('Owner')
  })

  it('shows only the Companies crumb on the companies list', () => {
    setMockRoute({ name: 'teams', params: {}, path: '/teams', meta: { name: 'Companies' } })
    const text = mountBreadcrumb().text()
    expect(text).toContain('Companies')
    expect(text).not.toContain(mockTeamData.name)
  })

  it('renders a skeleton while the team is loading', () => {
    mockTeamStore.currentTeamMeta = { isPending: true, data: undefined } as never
    expect(mountBreadcrumb().find('[data-test="loader"]').exists()).toBe(true)
  })
})
