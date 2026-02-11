import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, nextTick } from 'vue'

import CurrentBoDSection from '../CurrentBoDSection.vue'
import { useTeamStore } from '@/stores'
import { useReadContract } from '@wagmi/vue'
import { log, parseError } from '@/utils'

vi.mock('@/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils')>()
  return {
    ...actual,
    log: {
      ...actual.log,
      error: vi.fn()
    },
    parseError: vi.fn((error: unknown) => error)
  }
})

const CardStub = {
  props: ['title'],
  template: '<div><div data-test="card-title">{{ title }}</div><slot /></div>'
}
const NotFoundStub = { template: '<div data-test="not-found">no-members</div>' }

// Stub for UserComponentCol to expose passed props via attributes
const UserColStub = {
  props: ['user', 'isDetailedView'],
  template:
    '<div data-test="user-col" :data-address="user?.address" :data-name="user?.name" :data-detailed="String(isDetailedView)"></div>'
}

describe('CurrentBoDSection', () => {
  type TeamMember = { address: string; name: string }
  type TeamStoreMock = {
    getContractAddressByType: (type: string) => string
    currentTeamMeta?: { data?: { members: TeamMember[] } }
  }

  let mockTeamStore: TeamStoreMock
  let readContractMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
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
  })

  it('shows Loading... when fetching', async () => {
    readContractMock.mockImplementation((options: { functionName?: string }) => {
      if (options.functionName === 'getBoardOfDirectors') {
        return { data: ref([]), isFetching: ref(true) }
      }
      return { data: ref([]), error: ref(null) }
    })

    const wrapper = mount(CurrentBoDSection, {
      global: {
        stubs: {
          CardComponent: CardStub,
          UserComponentCol: UserColStub,
          CurrentBoDSection404: NotFoundStub
        }
      }
    })

    expect(wrapper.text()).toContain('Loading...')
  })

  it('shows 404 fallback when no members and not fetching', async () => {
    readContractMock.mockImplementation(() => ({
      data: ref([]),
      isFetching: ref(false)
    }))

    const wrapper = mount(CurrentBoDSection, {
      global: {
        stubs: {
          CardComponent: CardStub,
          UserComponentCol: UserColStub,
          CurrentBoDSection404: NotFoundStub
        }
      }
    })

    expect(wrapper.find('[data-test="not-found"]').exists()).toBe(true)
  })

  it('renders current board members when data is available', async () => {
    readContractMock.mockImplementation((options: { functionName?: string }) => {
      if (options.functionName === 'getBoardOfDirectors') {
        return { data: ref(['0x1', '0x2']), isFetching: ref(false) }
      }
      return { data: ref([]), error: ref(null) }
    })

    const wrapper = mount(CurrentBoDSection, {
      global: {
        stubs: {
          CardComponent: CardStub,
          UserComponentCol: UserColStub,
          CurrentBoDSection404: NotFoundStub
        }
      }
    })

    const users = wrapper.findAll('[data-test="user-col"]')
    expect(users.length).toBe(2)
    expect(users[0]?.attributes('data-name')).toBe('Alice')
    expect(users[1]?.attributes('data-name')).toBe('Bob')
    expect(wrapper.find('[data-test="card-title"]').text()).toContain('Current')
  })

  it('renders election winners when electionId is provided', async () => {
    readContractMock.mockImplementation((options: { functionName?: string }) => {
      if (options.functionName === 'getBoardOfDirectors') {
        return { data: ref(['0x1']), isFetching: ref(false) }
      }
      return { data: ref(['0x2']), error: ref(null) }
    })

    const wrapper = mount(CurrentBoDSection, {
      props: { electionId: 1n },
      global: {
        stubs: {
          CardComponent: CardStub,
          UserComponentCol: UserColStub,
          CurrentBoDSection404: NotFoundStub
        }
      }
    })

    const users = wrapper.findAll('[data-test="user-col"]')
    expect(users.length).toBe(1)
    expect(users[0]?.attributes('data-name')).toBe('Bob')
    expect(wrapper.find('[data-test="card-title"]').text()).toContain('Elected')
  })

  it('logs when election winners request fails', async () => {
    const errorRef = ref<Error | null>(null)

    readContractMock.mockImplementation((options: { functionName?: string }) => {
      if (options.functionName === 'getElectionWinners') {
        return { data: ref([]), error: errorRef }
      }
      return { data: ref([]), isFetching: ref(false) }
    })

    mount(CurrentBoDSection, {
      props: { electionId: 1n },
      global: {
        stubs: {
          CardComponent: CardStub,
          UserComponentCol: UserColStub,
          CurrentBoDSection404: NotFoundStub
        }
      }
    })

    errorRef.value = new Error('boom')
    await nextTick()

    expect(parseError).toHaveBeenCalledWith(errorRef.value)
    expect(log.error).toHaveBeenCalled()
  })
})
