import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { computed, ref } from 'vue'
import ElectionActions from '../ElectionActions.vue'
import { useTeamStore, useUserDataStore } from '@/stores'
import { useRouter } from 'vue-router'

// Mock composables module and provide a mutable mock function
const mockUseBoDElections = vi.fn()
vi.mock('@/composables/elections', () => ({
  useBoDElections: (...args: unknown[]) => mockUseBoDElections(...(args as unknown[]))
}))

type ElectionMock = {
  election: { id: number; resultsPublished: boolean } | null
  status: { text: string } | null
  owner?: string
}

const mockElections = ({ election, status, owner = '0xowner' }: ElectionMock) => {
  mockUseBoDElections.mockReturnValue({
    formattedElection: computed(() => election),
    electionStatus: computed(() => status),
    owner: ref(owner)
  })
}

const PublishStub = {
  props: ['disabled', 'disabledReason', 'electionId'],
  template:
    '<div data-test="publish" :data-disabled="disabled" :data-reason="disabledReason" :data-election-id="electionId"></div>'
}

const mountActions = () =>
  mount(ElectionActions, {
    props: { electionId: 1n },
    global: { stubs: { PublishResult: PublishStub } }
  })

describe('ElectionActions', () => {
  beforeEach(() => {
    mockUseBoDElections.mockReset()
    vi.mocked(useTeamStore).mockReturnValue({ currentTeamId: '1' } as ReturnType<
      typeof useTeamStore
    >)
    vi.mocked(useUserDataStore).mockReturnValue({ address: '0xowner' } as ReturnType<
      typeof useUserDataStore
    >)
    vi.mocked(useRouter).mockReturnValue({
      push: vi.fn(),
      currentRoute: { value: { fullPath: '/' } }
    } as ReturnType<typeof useRouter>)
  })

  it('shows Vote Now button when election is active and not published', () => {
    mockElections({ election: { id: 1, resultsPublished: false }, status: { text: 'Active' } })

    const wrapper = mountActions()

    // First button should render with Vote Now text
    expect(wrapper.text()).toContain('Vote Now')
  })

  it('offers Publish Results on the elections page when the election is over', () => {
    mockElections({ election: { id: 2, resultsPublished: false }, status: { text: 'Completed' } })

    const wrapper = mountActions()

    const publish = wrapper.find('[data-test="publish"]')
    expect(publish.exists()).toBe(true)
    expect(publish.attributes('data-election-id')).toBe('2')
    expect(publish.attributes('data-disabled')).toBe('false')
  })

  it('disables Publish Results with a reason for anyone but the owner', () => {
    mockElections({
      election: { id: 2, resultsPublished: false },
      status: { text: 'Completed' },
      owner: '0xsomeoneelse'
    })

    const publish = mountActions().find('[data-test="publish"]')
    expect(publish.attributes('data-disabled')).toBe('true')
    expect(publish.attributes('data-reason')).toBe('Only the owner can publish the results')
  })

  it('does not offer Publish Results once the results are published', () => {
    mockElections({ election: { id: 2, resultsPublished: true }, status: { text: 'Completed' } })

    expect(mountActions().find('[data-test="publish"]').exists()).toBe(false)
  })

  it('emits showCreateElectionModal when Create Election clicked and not disabled', async () => {
    mockElections({ election: null, status: null })

    const wrapper = mountActions()

    // Only Create Election should be visible
    const btn = wrapper.find('button')
    expect(btn.exists()).toBe(true)

    await btn.trigger('click')
    expect(wrapper.emitted()).toHaveProperty('showCreateElectionModal')
  })

  it('shows Create Election disabled while the previous results are unpublished', async () => {
    mockElections({ election: { id: 2, resultsPublished: false }, status: { text: 'Completed' } })

    const wrapper = mountActions()
    const createButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('Create Election'))

    expect(createButton?.attributes('disabled')).toBeDefined()

    const tooltips = wrapper.findAllComponents({ name: 'UTooltip' }).map((t) => t.props('text'))
    expect(tooltips).toContain(
      'Publish the results of the previous election before creating a new one'
    )

    await createButton?.trigger('click')
    expect(wrapper.emitted()).not.toHaveProperty('showCreateElectionModal')
  })
})
