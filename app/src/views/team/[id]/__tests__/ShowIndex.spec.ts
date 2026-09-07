import { beforeEach, describe, expect, it, vi } from 'vitest'
import ShowIndex from '@/views/team/[id]/ShowIndex.vue'
import { mount } from '@vue/test-utils'
import { mockRoute, setMockRoute } from '@/tests/mocks/router.mock'
import { defineComponent, h, markRaw, nextTick, onMounted, type Component } from 'vue'

describe('ShowIndex', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mountShowIndex = (routerView: Component | boolean = true) =>
    mount(ShowIndex, {
      global: {
        stubs: {
          ContinueAddTeamForm: true,
          TeamMeta: true,
          CompanyOverview: true,
          TeamArchivedBanner: true,
          RouterView: routerView
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

  it('preserves the Accounting route owner between reports and remounts it for another team', async () => {
    const accountingOwnerMounted = vi.fn()
    const AccountingOwner = markRaw(
      defineComponent({
        setup() {
          onMounted(accountingOwnerMounted)
          return () => h('div', { 'data-test': 'accounting-owner' })
        }
      })
    )
    const RouterViewStub = defineComponent({
      setup(_, { slots }) {
        return () => slots.default?.({ Component: AccountingOwner })
      }
    })

    setMockRoute({
      name: 'accounting-summary',
      params: { id: '1' },
      path: '/teams/1/accounting/summary',
      fullPath: '/teams/1/accounting/summary'
    })
    const wrapper = mountShowIndex(RouterViewStub)
    await nextTick()
    const initialMountCount = accountingOwnerMounted.mock.calls.length
    expect(initialMountCount).toBeGreaterThan(0)

    mockRoute.name = 'accounting-ledger'
    mockRoute.path = '/teams/1/accounting/ledger'
    mockRoute.fullPath = '/teams/1/accounting/ledger'
    await nextTick()
    expect(accountingOwnerMounted).toHaveBeenCalledTimes(initialMountCount)

    mockRoute.params = { id: '2' }
    mockRoute.path = '/teams/2/accounting/ledger'
    mockRoute.fullPath = '/teams/2/accounting/ledger'
    await nextTick()
    expect(accountingOwnerMounted.mock.calls.length).toBeGreaterThan(initialMountCount)
    wrapper.unmount()
  })
})
