import { beforeEach, describe, expect, it, vi } from 'vitest'
import ShowIndex from '@/views/team/[id]/ShowIndex.vue'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { createRouter, createWebHistory } from 'vue-router'
import { mockTeamData } from '@/tests/mocks/index'

describe('ShowIndex', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const router = createRouter({
    history: createWebHistory(),
    routes: [
      {
        path: '/team/:id',
        name: 'show-team',
        meta: { name: 'Team View' },
        component: { template: '<div>Home</div>' }
      } // Basic route
    ] // Define your routes here if needed
  })
  // TODO test navigation

  it('should render the team Breadcrumb', async () => {
    const wrapper = mount(ShowIndex, {
      global: {
        plugins: [
          router,
          createTestingPinia({ createSpy: vi.fn })
        ],
        stubs: {
          ContinueAddTeamForm: true,
          TeamMeta: true,
          MemberSection: true
        }
      }
    })
    await router.push({ name: 'show-team', params: { id: '1' } })
    await wrapper.vm.$nextTick()
    expect(wrapper.html()).toContain('Team View')

    // Test that team name is rendered
    expect(wrapper.html()).toContain(mockTeamData.name)
  })

  // Display the component whit the officer address

  // TODO: change route
  // TODO: Click the modal
})
