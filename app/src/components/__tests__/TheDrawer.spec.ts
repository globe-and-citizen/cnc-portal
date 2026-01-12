import { describe, it, expect, vi, beforeEach } from 'vitest'
import TheDrawer from '@/components/TheDrawer.vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import { createTestingPinia } from '@pinia/testing'
import { ref } from 'vue'
import { useTeamStore } from '@/stores'
// import { mockTeamStore } from '@/tests/mocks/store.mock'

// Create a router instance with a basic route
const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: { template: '<div>Home</div>' } },
    { path: '/teams', component: { template: '<div>Teams</div>' } },
    {
      path: '/teams/:id',
      name: 'show-team',
      meta: { name: 'Team View' },
      component: { template: '<div>Teams View</div>' },
      children: [
        { path: 'bank', name: 'bank', component: { template: '<div>Teams Bank</div>' } },
        {
          path: 'cash-remunerations',
          name: 'cash-remunerations',
          component: { template: '<div>Teams</div>' }
        },
        {
          path: 'expense-account',
          name: 'expense-account',
          component: { template: '<div>Teams</div>' }
        },
        {
          path: 'administration',
          name: 'administration',
          component: { template: '<div>Administration</div>' }
        }
      ]
    },
    {
      path: '/transactions',
      name: 'transactions',
      component: { template: '<div>Transactions</div>' }
    }
  ]
})

vi.mock('@wagmi/vue', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    useToastStore: vi.fn(() => ({
      addErrorToast: vi.fn(),
      addSuccessToast: vi.fn()
    })),
    useAccount: vi.fn(() => {
      return {
        chainId: ref(11155111)
      }
    }),
    useSwitchChain: vi.fn(() => {
      return {
        switchChain: vi.fn()
      }
    })
  }
})

describe('TheDrawer', () => {
  const name = 'John Doe'
  const address = '0xc0ffee254729296a45a3885639AC7E10F9d54979'

  const createWrapper = (props = {} /*, initialState = {}*/) => {
    return mount(TheDrawer, {
      props: {
        user: { name, address },
        modelValue: false,
        ...props
      },
      global: {
        plugins: [
          router,
          createTestingPinia({
            createSpy: vi.fn
            /*initialState: {
              team: {
                currentTeam: {
                  id: '1',
                  name: 'Team A',
                  cashRemunerationEip712Address: 'address1',
                  expenseAccountEip712Address: 'address2'
                },
                teamsMeta: {
                  teams: [
                    { id: '1', name: 'Team A', members: [] },
                    { id: '2', name: 'Team B', members: [1, 2] }
                  ],
                  teamsAreFetching: false,
                  teamsError: null
                },
                ...initialState
              }
            }*/
          })
        ],
        stubs: {
          RouterLink: {
            template: '<a><slot></slot></a>',
            props: ['to']
          },
          TeamMetaComponent: {
            template: '<div data-test="team-item">{{ team.name }}</div>',
            props: ['team', 'isSelected']
          },
          ButtonUI: {
            template: '<button><slot></slot></button>',
            props: ['variant']
          },
          ArrowLeftStartOnRectangleIcon: {
            template: '<div class="is-collapsed">Left</div>'
          },
          ArrowRightStartOnRectangleIcon: {
            template: '<div class="not-collapsed">Right</div>'
          }
        }
      }
    })
  }

  const mockTeamStore = {
    currentTeam: {
      id: '1',
      name: 'Team A',
      cashRemunerationEip712Address: 'address1',
      expenseAccountEip712Address: 'address2'
    },
    teamsMeta: {
      teams: [
        { id: '1', name: 'Team A', members: [] },
        { id: '2', name: 'Team B', members: [1, 2] }
      ],
      teamsAreFetching: false,
      teamsError: null,
      reloadTeams: vi.fn()
    }
  }
  beforeEach(() => {
    //@ts-expect-error: Mocking the store
    vi.mocked(useTeamStore).mockReturnValue({ ...mockTeamStore })
    vi.clearAllMocks()
  })

  describe('Component Rendering', () => {
    it('should render basic component structure', () => {
      const wrapper = createWrapper()
      expect(wrapper.exists()).toBe(true)
      expect(wrapper.find('[data-test="toggle-collapse"]').exists()).toBe(true)
      expect(wrapper.find('[data-test="team-display"]').exists()).toBe(true)
      expect(wrapper.find('[data-test="edit-user-card"]').exists()).toBe(true)
    })

    it('should render user information correctly', () => {
      const wrapper = createWrapper()
      expect(wrapper.find('[data-test="user-name"]').text()).toBe(name)
      expect(wrapper.find('[data-test="formatted-address"]').text()).toBe('0xc0ff...4979')
    })

    it('should render default avatar when no avatarUrl provided', () => {
      const wrapper = createWrapper()
      const avatar = wrapper.find('[alt="User Avatar"]')
      expect(avatar.attributes('src')).toBe(
        'https://img.daisyui.com/images/stock/photo-1534528741775-53994a69daeb.webp'
      )
    })

    it('should render custom avatar when imageUrl provided', () => {
      const imageUrl = 'https://example.com/avatar.jpg'
      const wrapper = createWrapper({
        user: { name, address, imageUrl }
      })
      const avatar = wrapper.find('[alt="User Avatar"]')
      expect(avatar.attributes('src')).toBe(imageUrl)
    })
  })

  describe('Collapse Functionality', () => {
    it('should toggle collapse state when button is clicked', async () => {
      const wrapper = createWrapper()
      const collapseButton = wrapper.find('[data-test="toggle-collapse"]')

      // Initially not collapsed
      expect(wrapper.find('.not-collapsed').exists()).toBe(true)
      expect(wrapper.find('.is-collapsed').exists()).toBe(false)

      await collapseButton.trigger('click')
      expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([true])

      await wrapper.setProps({ modelValue: true })
      expect(wrapper.find('.is-collapsed').exists()).toBe(true)
      expect(wrapper.find('.not-collapsed').exists()).toBe(false)
    })

    it('should adjust width based on collapse state', async () => {
      const wrapper = createWrapper()
      expect(wrapper.classes()).toContain('w-[280px]')

      await wrapper.setProps({ modelValue: true })
      expect(wrapper.classes()).toContain('w-24')
    })
  })

  describe('Team Selection', () => {
    it('should display team dropdown when clicked', async () => {
      const wrapper = createWrapper()
      const teamSelector = wrapper.find('[data-test="team-display"]')

      expect(teamSelector.exists()).toBe(true)
      const teamName = teamSelector.find('.text-sm.font-medium.text-gray-700')
      expect(teamName.text()).toBe('Team A')
      expect(teamSelector.find('[data-test="team-dropdown"]').exists()).toBe(false)

      await teamSelector.trigger('click')
      await wrapper.vm.$nextTick()
      expect(teamSelector.find('[data-test="team-dropdown"]').exists()).toBe(true)
    })

    it.skip('should show loading state when fetching teams', async () => {
      //@ts-expect-error: Mocking the store
      vi.mocked(useTeamStore).mockReturnValue({
        ...mockTeamStore,
        teamsMeta: {
          teams: [],
          teamsAreFetching: true,
          teamsError: null,
          reloadTeams: vi.fn()
        }
      })

      const wrapper = createWrapper()
      /*{},
        {
          teamsMeta: {
            teams: [],
            teamsAreFetching: true,
            teamsError: null
          }
        }*/

      const teamSelector = wrapper.find('[data-test="team-display"]')
      await teamSelector.trigger('click')
      // await wrapper.vm.$nextTick()
      await flushPromises()

      expect(wrapper.find('.skeleton').exists()).toBe(true)
    })
  })

  describe('Navigation Menu', () => {
    it('should render all menu items', () => {
      const wrapper = createWrapper()
      const menuItems = wrapper.findAll('nav a')
      expect(menuItems.length).toBe(8) // Total number of menu items
    })

    it('should highlight active menu item', async () => {
      const wrapper = createWrapper()
      await router.push({ name: 'show-team', params: { id: '1' } })
      await wrapper.vm.$nextTick()

      const activeItem = wrapper.find('.bg-emerald-500\\/10')
      expect(activeItem.exists()).toBe(true)
      expect(activeItem.text()).toContain('Dashboard')
    })

    it('should show/hide conditional menu items based on team properties', async () => {
      const wrapper = createWrapper()
      /*{},
        {
          currentTeam: {
            name: 'Team A',
            cashRemunerationEip712Address: null,
            expenseAccountEip712Address: null
          }
        }*/

      await wrapper.vm.$nextTick()
      const menuItems = wrapper.findAll('nav a:not(.hidden)')
      expect(menuItems.length).toBe(2)
    })
  })

  describe('Add Team Modal', () => {
    it('should open add team modal when create team button is clicked', async () => {
      const wrapper = createWrapper()
      const teamSelector = wrapper.find('[data-test="team-display"]')
      await teamSelector.trigger('click')

      const addTeamButton = wrapper.find('[data-test="add-team"]')
      await addTeamButton.trigger('click')

      const pinia = wrapper.vm.$pinia
      expect(pinia.state.value.app.showAddTeamModal).toBe(true)
    })
  })
})
