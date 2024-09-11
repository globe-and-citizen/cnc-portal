import { mount } from '@vue/test-utils'
import { describe, it, expect, beforeEach } from 'vitest'
import TeamView from '@/views/TeamView.vue'

import { setActivePinia, createPinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
// TODO: User Mock on composable like in proposal Card Spec
// Create a router instance with a basic route
const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: { template: '<div>Home</div>' } },
    { path: '/teams', component: { template: '<div>Teams</div>' } },
    { path: '/transactions', component: { template: '<div>Teams</div>' } }
  ]
})
describe('TeamView.vue', () => {
  let wrapper: ReturnType<typeof mount>

  beforeEach(() => {
    setActivePinia(createPinia())

    wrapper = mount(TeamView, {
      global: {
        plugins: [router] // Provide the router instance
      }
    })
  })

  describe('Render', () => {
    it('should render TeamView component', () => {
      expect(wrapper.exists()).toBe(true)
    })

    it('should render loading spinner when teams are being fetched', async () => {
      // wrapper.vm.teamsAreFetching = true
      // await wrapper.setData({ teamsAreFetching: true })
      await wrapper.vm.$nextTick()
      expect(wrapper.find('.loading-spinner').exists()).toBe(true)
    })

    // it('should render message when there are no teams', async () => {
    //   wrapper.vm.teams = []
    //   expect(wrapper.vm).toMatchInlineSnapshot(`{}`)
    //   await wrapper.vm.$nextTick()
    //   expect(wrapper.find('span').text()).toContain('You are currently not a part of any team')
    // })

    it('should render error message when there is an error', async () => {
      interface ComponentData {
        teamError: string
      }

      ;(wrapper.vm as unknown as ComponentData).teamError = 'Unable to fetch teams'
      // await wrapper.setData({ teamError: 'Unable to fetch teams' })
      await wrapper.vm.$nextTick()
      expect(wrapper.find('.alert.alert-warning').exists()).toBe(true)
      expect(wrapper.find('.alert.alert-warning').text()).toContain(
        'We are unable to retrieve your teams'
      )
    })
  })
})
