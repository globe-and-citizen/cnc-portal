import { beforeEach, describe, expect, it, vi } from 'vitest'
import ShowIndex from '@/views/team/[id]/ShowIndex.vue'
import { mount } from '@vue/test-utils'
import { setMockRoute } from '@/tests/mocks/router.mock'

describe('ShowIndex', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mountShowIndex = () =>
    mount(ShowIndex, {
      global: {
        stubs: {
          ContinueAddTeamForm: true,
          TeamMeta: true,
          CompanyOverview: true,
          TeamArchivedBanner: true,
          RouterView: true
        }
      }
    })

  it('renders the team overview sections on the show-team route', () => {
    // The global teamStore mock exposes currentTeamMeta.data = mockTeamData.
    setMockRoute({ name: 'show-team', params: { id: '1' }, meta: { name: 'Overview' } })

    const wrapper = mountShowIndex()

    expect(wrapper.html()).toContain('team-meta-stub')
    expect(wrapper.html()).toContain('company-overview-stub')
  })

  it('no longer renders an in-page breadcrumb (it now lives in the navbar)', () => {
    setMockRoute({ name: 'show-team', params: { id: '1' }, meta: { name: 'Overview' } })

    const wrapper = mountShowIndex()

    // The breadcrumb skeleton/loader used to render here; it belongs to NavBreadcrumb now.
    expect(wrapper.find('[data-test="loader"]').exists()).toBe(false)
  })
})
