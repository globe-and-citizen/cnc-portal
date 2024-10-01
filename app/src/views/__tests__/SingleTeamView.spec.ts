import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import SingleTeamView from '@/views/SingleTeamView.vue' // Update the import path as necessary
import { createPinia, setActivePinia } from 'pinia'

describe('SingleTeamView', () => {
  interface wrapperType {
    vm: {
      team: {
        ownerAddress: string
      }
      teamIsFetching: boolean
      $nextTick: () => Promise<void>
    }
    find: (selector: string) => {
      exists: () => boolean
    }
  }
  let wrapper: unknown

  beforeEach(async () => {
    setActivePinia(createPinia())
    vi.mock('vue-router', () => ({
      useRoute: vi.fn(() => ({
        params: {
          id: 0
        }
      }))
    }))

    wrapper = mount(SingleTeamView)
  })

  it('renders loading spinner when team is being fetched', async () => {
    ;(wrapper as wrapperType).vm.teamIsFetching = true
    await (wrapper as wrapperType).vm.$nextTick()
    expect((wrapper as wrapperType).find('.loading-spinner').exists()).toBe(true)
  })

  it('does not show Manage Deployments button for non-owner', async () => {
    ;(wrapper as wrapperType).vm.team = { ownerAddress: 'otherAddress' }
    await (wrapper as wrapperType).vm.$nextTick()
    expect((wrapper as wrapperType).find('[data-test="manageOfficer"]').exists()).toBe(false)
  })
})
