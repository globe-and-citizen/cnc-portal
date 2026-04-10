import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { nextTick } from 'vue'
import SidebarLayout from '@/components/ui/SidebarLayout.vue'

describe('SidebarLayout.vue', () => {
  let router: ReturnType<typeof createRouter>

  beforeEach(() => {
    router = createRouter({
      history: createMemoryHistory(),
      routes: [
        {
          path: '/',
          component: { template: '<div>Home</div>' }
        },
        {
          path: '/teams',
          component: { template: '<div>Teams</div>' }
        },
        {
          path: '/teams/:id',
          name: 'show-team',
          component: { template: '<div>Team Detail</div>' }
        },
        {
          path: '/teams/:id/bank-account',
          name: 'bank-account',
          component: { template: '<div>Bank Account</div>' }
        },
        {
          path: '/teams/:id/safe-account/:address',
          name: 'safe-account',
          component: { template: '<div>Safe Account</div>' }
        },
        {
          path: '/teams/:id/expense-account',
          name: 'expense-account',
          component: { template: '<div>Expense Account</div>' }
        },
        {
          path: '/teams/:id/payroll-account',
          name: 'payroll-account',
          component: { template: '<div>Payroll Account</div>' }
        },
        {
          path: '/teams/:id/payroll-history/:memberAddress',
          name: 'payroll-history',
          component: { template: '<div>Payroll History</div>' }
        },
        {
          path: '/teams/:id/team-payroll',
          name: 'team-payroll',
          component: { template: '<div>Team Payroll</div>' }
        },
        {
          path: '/teams/:id/contract-management',
          name: 'contract-management',
          component: { template: '<div>Contract Management</div>' }
        },
        {
          path: '/teams/:id/sher-token',
          name: 'sher-token',
          component: { template: '<div>SHER Token</div>' }
        },
        {
          path: '/teams/:id/bod-elections',
          name: 'bod-elections',
          component: { template: '<div>BoD Elections</div>' }
        },
        {
          path: '/teams/:id/bod-proposals',
          name: 'bod-proposals',
          component: { template: '<div>BoD Proposals</div>' }
        },
        {
          path: '/teams/:id/vesting',
          name: 'vesting',
          component: { template: '<div>Vesting</div>' }
        }
      ]
    })
    vi.clearAllMocks()
  })

  it('should toggle modal when clicking user card', async () => {
    await router.push('/teams/1')
    await router.isReady()

    const wrapper = mount(SidebarLayout, {
      global: {
        stubs: {
          UDashboardSidebar: {
            template: `
              <div>
                <slot name="header" :collapsed="false" />
                <slot name="default" :collapsed="false" />
                <slot name="footer" :collapsed="false" />
              </div>
            `,
            props: ['collapsible', 'resizable', 'class', 'ui']
          },
          DashboardSidebar: {
            template: `
              <div>
                <slot name="header" :collapsed="false" />
                <slot name="default" :collapsed="false" />
                <slot name="footer" :collapsed="false" />
              </div>
            `,
            props: ['collapsible', 'resizable', 'class', 'ui']
          },
          UNavigationMenu: true,
          NavigationMenu: true,
          UModal: {
            template: `
              <div>
                <slot />
                <template v-if="open">
                  <div data-test="modal-body">
                    <slot name="body" />
                  </div>
                </template>
              </div>
            `,
            props: ['open', 'title', 'description'],
            emits: ['update:open']
          },
          Modal: {
            template: `
              <div>
                <slot />
                <template v-if="open">
                  <div data-test="modal-body">
                    <slot name="body" />
                  </div>
                </template>
              </div>
            `,
            props: ['open', 'title', 'description'],
            emits: ['update:open']
          },
          EditUserForm: true
        },
        plugins: [router]
      }
    })

    const userCard = wrapper.find('[data-test="edit-user-card"]')
    expect(userCard.exists()).toBe(true)
    expect((wrapper.vm as { open: boolean }).open).toBe(false)

    await userCard.trigger('click')
    await nextTick()

    expect((wrapper.vm as { open: boolean }).open).toBe(true)
  })
})
