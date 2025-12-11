import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import ElectionActions from '../ElectionActions.vue'

// Mock vue-router useRouter
vi.mock('vue-router', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    currentRoute: { value: { fullPath: '/' } }
  }))
}))

// Mock stores
vi.mock('@/stores', () => ({
  useTeamStore: vi.fn(() => ({ currentTeamId: '1' })),
  useUserDataStore: vi.fn(() => ({ address: '0xowner' }))
}))

// Mock composables module and provide a mutable mock function
const mockUseBoDElections = vi.fn()
vi.mock('@/composables', () => ({
  useBoDElections: (...args: unknown[]) => mockUseBoDElections(...(args as unknown[]))
}))

describe('ElectionActions', () => {
  beforeEach(() => {
    mockUseBoDElections.mockReset()
  })

  it('shows Vote Now button when election is active and not published', () => {
    mockUseBoDElections.mockReturnValue({
      formattedElection: { id: 1, resultsPublished: false },
      electionStatus: { text: 'Active' },
      owner: '0xowner'
    })

    const wrapper = mount(ElectionActions, {
      global: {
        stubs: {
          ButtonUI: { template: '<button @click="$emit(\'click\')"><slot/></button>' },
          PublishResult: true
        }
      }
    })

    // First button should render with Vote Now text
    expect(wrapper.text()).toContain('Vote Now')
  })

  it('renders PublishResult when showPublishResult provided and election completed', () => {
    mockUseBoDElections.mockReturnValue({
      formattedElection: { id: 2, resultsPublished: false },
      electionStatus: { text: 'Completed' },
      owner: '0xowner'
    })

    const PublishStub = {
      props: ['disabled', 'electionId'],
      template:
        '<div data-test="publish" :data-disabled="disabled" :data-election-id="electionId"></div>'
    }

    const wrapper = mount(ElectionActions, {
      global: {
        provide: { showPublishResultBtn: true },
        stubs: {
          ButtonUI: { template: '<button @click="$emit(\'click\')"><slot/></button>' },
          PublishResult: PublishStub
        }
      }
    })

    const publish = wrapper.find('[data-test="publish"]')
    expect(publish.exists()).toBe(true)
    // disabled should be true because mocked userStore address equals owner? In stores mock address is '0xowner'
    expect(publish.attributes('data-election-id')).toBe('2')
  })

  it('emits showCreateElectionModal when Create Election clicked and not disabled', async () => {
    mockUseBoDElections.mockReturnValue({
      formattedElection: null,
      electionStatus: undefined,
      owner: '0xowner'
    })

    const wrapper = mount(ElectionActions, {
      global: {
        stubs: {
          ButtonUI: { template: '<button @click="$emit(\'click\')"><slot/></button>' },
          PublishResult: true
        }
      }
    })

    // Only Create Election should be visible
    const btn = wrapper.find('button')
    expect(btn.exists()).toBe(true)

    await btn.trigger('click')
    expect(wrapper.emitted()).toHaveProperty('showCreateElectionModal')
  })
})
