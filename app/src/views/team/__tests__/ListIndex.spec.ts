import { beforeEach, describe, expect, it, vi } from 'vitest'
import ListIndex from '@/views/team/ListIndex.vue'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'

vi.mock('vue-router', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    useRoute: vi.fn(() => ({
      params: {
        id: 0
      },
      meta: {
        name: 'Team List View'
      }
    })),
    useRouter: vi.fn(() => ({
      push: vi.fn()
    }))
  }
})


describe('ListIndex', () => {
  const queryClient = new QueryClient()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render the team List and switch from loading, to error , empty data or somes data', async () => {

    const wrapper = mount(ListIndex, {
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn }), [VueQueryPlugin, { queryClient }]],
        stubs: ['AddTeamForm']
      }
    })

    await wrapper.vm.$nextTick()
    expect(wrapper.html()).toContain('Team List View')
    // Open the modal by clicking the button
    wrapper.find('[data-test="add-team"]').trigger('click')
  })

})
