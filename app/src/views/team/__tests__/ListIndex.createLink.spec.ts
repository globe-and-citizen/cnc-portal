import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ListIndex from '@/views/team/ListIndex.vue'
import { createMockQueryResponse } from '@/tests/mocks/query.mock'
import { mockTeamsData, mockRouterReplace } from '@/tests/mocks'
import { useRoute } from 'vue-router'
import { useGetTeamsQuery } from '@/queries/team.queries'

// Deep link from the navbar team picker's "Create company" action (#2211):
// /teams?create=1 should auto-open the create modal (now owned by the toolbar)
// and strip the query so a refresh doesn't re-open it.
describe('ListIndex - create-company deep link', () => {
  beforeEach(() => vi.clearAllMocks())

  it('auto-opens the create modal and clears ?create=1', async () => {
    vi.mocked(useRoute).mockReturnValue({
      params: {},
      meta: { name: 'Companies' },
      query: { create: '1' }
    } as unknown as ReturnType<typeof useRoute>)
    vi.mocked(useGetTeamsQuery).mockReturnValueOnce(createMockQueryResponse(mockTeamsData))

    const wrapper = mount(ListIndex, {
      global: { stubs: { TeamCard: true, AddTeamForm: true } }
    })
    await wrapper.vm.$nextTick()

    // The global UModal stub only renders its body (with the close button) when open.
    expect(wrapper.find('[data-test="close-wage-modal-button"]').exists()).toBe(true)
    expect(mockRouterReplace).toHaveBeenCalledWith({ query: {} })
  })
})
