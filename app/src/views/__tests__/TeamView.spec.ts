// TeamView.test.ts
import { mount } from '@vue/test-utils'
import { describe, it, expect, beforeEach } from 'vitest'
import { ref } from 'vue'
import TeamView from '@/views/TeamView.vue'

describe('TeamView.vue', () => {
  let wrapper: any

  beforeEach(() => {
    wrapper = mount(TeamView, {
      setup() {
        const teamsAreFetching = ref(false)
        const teams = ref({
          teams: []
        })
        return {
          teamsAreFetching,
          teams
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
  })
})
