import { mount, type VueWrapper } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { nextTick } from 'vue'

import BodMembersSection from '../BodMembersSection.vue'
import { useTeamStore } from '@/stores'
import { log } from '@/lib/logging'
import { mockBODReads, mockElectionsReads } from '@/tests/mocks'

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
  // Both the board and the winners are read through module-level mocks shared by
  // every mount, so a component left alive by an earlier test would still answer
  // to them.
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

  const seedBoard = (members: string[] | undefined, isFetching = false) => {
    mockBODReads.boardMembers.data.value = members
    mockBODReads.boardMembers.isFetching.value = isFetching
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

    seedBoard([])
    mockElectionsReads.getWinners.data.value = []
    mockElectionsReads.getWinners.error.value = null
  })

  afterEach(() => {
    wrappers.forEach((wrapper) => wrapper.unmount())
  })

  it('shows Loading... when fetching', async () => {
    seedBoard([], true)

    const wrapper = mountSection()

    expect(wrapper.text()).toContain('Loading...')
  })

  it('shows the empty Board state when no members are available', async () => {
    const wrapper = mountSection()

    expect(wrapper.find('[data-test="not-found"]').exists()).toBe(true)
  })

  it('[AC-US-EL-07-01] renders current board members when data is available', async () => {
    seedBoard(['0x1', '0x2'])

    const wrapper = mountSection()

    const users = wrapper.findAll('[data-test="user-col"]')
    expect(users.length).toBe(2)
    expect(users[0]?.attributes('data-name')).toBe('Alice')
    expect(users[1]?.attributes('data-name')).toBe('Bob')
  })

  it('[AC-US-EL-07-02] renders election winners when electionId is provided', async () => {
    seedBoard(['0x1'])
    mockElectionsReads.getWinners.data.value = ['0x2']

    const wrapper = mountSection({ electionId: 1n })

    const users = wrapper.findAll('[data-test="user-col"]')
    expect(users.length).toBe(1)
    expect(users[0]?.attributes('data-name')).toBe('Bob')
  })

  it('renders the elected board even when the current board is empty', async () => {
    mockElectionsReads.getWinners.data.value = ['0x2']

    const wrapper = mountSection({ electionId: 1n })

    expect(wrapper.findAll('[data-test="user-col"]')).toHaveLength(1)
    expect(wrapper.find('[data-test="not-found"]').exists()).toBe(false)
  })

  it('falls back to empty list when board data is unavailable', async () => {
    seedBoard(undefined)

    const wrapper = mountSection()

    // No members rendered; 404 fallback is shown instead
    expect(wrapper.findAll('[data-test="user-col"]')).toHaveLength(0)
    expect(wrapper.find('[data-test="not-found"]').exists()).toBe(true)
  })

  it('follows the board as the shared read settles', async () => {
    const wrapper = mountSection()
    expect(wrapper.find('[data-test="not-found"]').exists()).toBe(true)

    seedBoard(['0x1'])
    await nextTick()

    expect(wrapper.findAll('[data-test="user-col"]')).toHaveLength(1)
    expect(wrapper.find('[data-test="not-found"]').exists()).toBe(false)
  })

  it('logs when election winners request fails', async () => {
    mountSection({ electionId: 1n })

    const error = new Error('boom')
    mockElectionsReads.getWinners.error.value = error
    await nextTick()

    expect(log.error).toHaveBeenCalledWith(expect.any(String), error)
  })

  it('does not log when election winners error is cleared', async () => {
    mockElectionsReads.getWinners.error.value = new Error('boom')

    mountSection({ electionId: 1n })

    mockElectionsReads.getWinners.error.value = null
    await nextTick()

    expect(log.error).not.toHaveBeenCalled()
  })
})
