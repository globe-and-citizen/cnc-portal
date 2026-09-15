import { mount, type VueWrapper } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref, nextTick } from 'vue'

import BodMembersSection from '../BodMembersSection.vue'
import { useTeamStore } from '@/stores'
import { useReadContract } from '@wagmi/vue'
import { log } from '@/lib/logging'
import { mockElectionsReads } from '@/tests/mocks'

const NotFoundStub = { template: '<div data-test="not-found">no-members</div>' }

// Stub for UserIdentity to expose passed props via attributes
const UserIdentityStub = {
  props: ['user', 'isDetailedView'],
  template:
    '<div data-test="user-col" :data-address="user?.address" :data-name="user?.name" :data-detailed="String(isDetailedView)"></div>'
}

describe('BodMembersSection', () => {
  type TeamMember = { address: string; name: string }
  type TeamStoreMock = {
    getContractAddressByType: (type: string) => string
    currentTeamMeta?: { data?: { members: TeamMember[] } }
  }

  let mockTeamStore: TeamStoreMock
  let readContractMock: ReturnType<typeof vi.fn>
  // Winners are read through a module-level mock shared by every mount, so a
  // component left alive by an earlier test would still answer to it.
  let wrappers: VueWrapper[]

  const mountSection = (props?: { electionId: bigint }) => {
    const wrapper = mount(BodMembersSection, {
      props,
      global: {
        stubs: {
          UserIdentity: UserIdentityStub,
          BodMembersEmptyState: NotFoundStub
        }
      }
    })
    wrappers.push(wrapper)
    return wrapper
  }

  beforeEach(() => {
    vi.clearAllMocks()
    wrappers = []
    mockTeamStore = {
      getContractAddressByType: vi.fn((type: string) => {
        if (type === 'BoardOfDirectors') return '0xBOD'
        if (type === 'Elections') return '0xELECTIONS'
        return ''
      }),
      currentTeamMeta: {
        data: {
          members: [
            { address: '0x1', name: 'Alice' },
            { address: '0x2', name: 'Bob' }
          ]
        }
      }
    }
    ;(useTeamStore as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => mockTeamStore)

    readContractMock = vi.fn()
    ;(useReadContract as unknown as ReturnType<typeof vi.fn>).mockImplementation(readContractMock)

    // Winners come from the shared Elections read, not from this component's own
    // `useReadContract`, so they are seeded here rather than in readContractMock.
    mockElectionsReads.getWinners.data.value = []
    mockElectionsReads.getWinners.error.value = null
  })

  afterEach(() => {
    wrappers.forEach((wrapper) => wrapper.unmount())
  })

  it('shows Loading... when fetching', async () => {
    readContractMock.mockImplementation((options: { functionName?: string }) => {
      if (options.functionName === 'getBoardOfDirectors') {
        return { data: ref([]), isFetching: ref(true) }
      }
      return { data: ref([]), error: ref(null) }
    })

    const wrapper = mountSection()

    expect(wrapper.text()).toContain('Loading...')
  })

  it('shows 404 fallback when no members and not fetching', async () => {
    readContractMock.mockImplementation(() => ({
      data: ref([]),
      isFetching: ref(false)
    }))

    const wrapper = mountSection()

    expect(wrapper.find('[data-test="not-found"]').exists()).toBe(true)
  })

  it('renders current board members when data is available', async () => {
    readContractMock.mockImplementation((options: { functionName?: string }) => {
      if (options.functionName === 'getBoardOfDirectors') {
        return { data: ref(['0x1', '0x2']), isFetching: ref(false) }
      }
      return { data: ref([]), error: ref(null) }
    })

    const wrapper = mountSection()

    const users = wrapper.findAll('[data-test="user-col"]')
    expect(users.length).toBe(2)
    expect(users[0]?.attributes('data-name')).toBe('Alice')
    expect(users[1]?.attributes('data-name')).toBe('Bob')
    // expect(wrapper.find('[data-test="card-title"]').text()).toContain('Current')
  })

  it('renders election winners when electionId is provided', async () => {
    readContractMock.mockImplementation(() => ({
      data: ref(['0x1']),
      isFetching: ref(false)
    }))
    mockElectionsReads.getWinners.data.value = ['0x2']

    const wrapper = mountSection({ electionId: 1n })

    const users = wrapper.findAll('[data-test="user-col"]')
    expect(users.length).toBe(1)
    expect(users[0]?.attributes('data-name')).toBe('Bob')
  })

  it('renders the elected board even when the current board is empty', async () => {
    readContractMock.mockImplementation(() => ({
      data: ref([]),
      isFetching: ref(false)
    }))
    mockElectionsReads.getWinners.data.value = ['0x2']

    const wrapper = mountSection({ electionId: 1n })

    expect(wrapper.findAll('[data-test="user-col"]')).toHaveLength(1)
    expect(wrapper.find('[data-test="not-found"]').exists()).toBe(false)
  })

  it('falls back to empty list when board data is unavailable', async () => {
    readContractMock.mockImplementation((options: { functionName?: string }) => {
      if (options.functionName === 'getBoardOfDirectors') {
        return { data: ref(undefined), isFetching: ref(false) }
      }
      return { data: ref([]), error: ref(null) }
    })

    const wrapper = mountSection()

    // No members rendered; 404 fallback is shown instead
    expect(wrapper.findAll('[data-test="user-col"]')).toHaveLength(0)
    expect(wrapper.find('[data-test="not-found"]').exists()).toBe(true)
  })

  it('logs when election winners request fails', async () => {
    readContractMock.mockImplementation(() => ({ data: ref([]), isFetching: ref(false) }))

    mountSection({ electionId: 1n })

    const error = new Error('boom')
    mockElectionsReads.getWinners.error.value = error
    await nextTick()

    expect(log.error).toHaveBeenCalledWith(expect.any(String), error)
  })

  it('does not log when election winners error is cleared', async () => {
    readContractMock.mockImplementation(() => ({ data: ref([]), isFetching: ref(false) }))
    mockElectionsReads.getWinners.error.value = new Error('boom')

    mountSection({ electionId: 1n })

    mockElectionsReads.getWinners.error.value = null
    await nextTick()

    expect(log.error).not.toHaveBeenCalled()
  })
})
