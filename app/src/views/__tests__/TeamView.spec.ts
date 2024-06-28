import { mount } from '@vue/test-utils'
import { describe, it, expect, beforeEach } from 'vitest'
import { ref } from 'vue'
import TeamView from '@/views/TeamView.vue'

import { setActivePinia, createPinia } from 'pinia'
import { useUserDataStore } from '@/stores/user'

describe('TeamView.vue', () => {
  let wrapper: any

  beforeEach(() => {
    setActivePinia(createPinia())

    wrapper = mount(TeamView, {
      setup() {
        const teamsAreFetching = ref(false)
        const teams = ref([])
        const teamError = ref(null)
        const showAddTeamModal = ref(false)
        return {
          teamsAreFetching,
          teams,
          teamError,
          showAddTeamModal,
          useUserDataStore
        }
      }
    })
  })

  describe('Render', () => {
    it('should render TeamView component', () => {
      expect(wrapper.exists()).toBe(true)
    })

    it('should render loading spinner when teams are being fetched', async () => {
      wrapper.vm.teamsAreFetching = true
      await wrapper.vm.$nextTick()
      expect(wrapper.find('.loading-spinner').exists()).toBe(true)
    })

    it('should render message when there are no teams', async () => {
      wrapper.vm.teams = []
      await wrapper.vm.$nextTick()
      expect(wrapper.find('span').text()).toContain('You are currently not a part of any team')
    })

    it('should render error message when there is an error', async () => {
      wrapper.vm.teamError = 'Unable to fetch teams'
      await wrapper.vm.$nextTick()
      expect(wrapper.find('.alert.alert-warning').exists()).toBe(true)
      expect(wrapper.find('.alert.alert-warning').text()).toContain(
        'We are unable to retrieve your teams'
      )
    })
  })
})
