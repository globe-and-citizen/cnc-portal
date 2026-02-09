import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'

// Provide minimal constants to avoid import-time validation
vi.mock('@/constant', () => ({
  USDC_ADDRESS: '0x0000000000000000000000000000000000000001',
  USDC_E_ADDRESS: '0x0000000000000000000000000000000000000003',
  USDT_ADDRESS: '0x0000000000000000000000000000000000000002'
}))

import CurrentBoDSection from '../CurrentBoDSection.vue'
import { useTeamStore } from '@/stores'
import { useReadContract } from '@wagmi/vue'

const CardStub = { template: '<div><slot /></div>' }
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
    currentTeam: { members: TeamMember[] }
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
      currentTeam: {
        members: [
          { address: '0x1', name: 'Alice' },
          { address: '0x2', name: 'Bob' }
        ]
      }
    }
    ;(useTeamStore as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => mockTeamStore)

    readContractMock = vi.fn()
    ;(useReadContract as unknown as ReturnType<typeof vi.fn>).mockImplementation(readContractMock)
  })

  it.skip('renders board members when boardOfDirectors data is present', async () => {
    // When functionName is getBoardOfDirectors return two addresses
    readContractMock.mockImplementation((options: { functionName?: string }) => {
      if (options.functionName === 'getBoardOfDirectors') {
        return { data: ref(['0x1', '0x2']), isFetching: ref(false) }
      }
      // election winners
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
    expect(users).toHaveLength(2)

    const first = users[0]
    expect(first.attributes('data-address')).toBe('0x1')
    expect(first.attributes('data-name')).toBe('Alice')
    expect(first.attributes('data-detailed')).toBe('true')
  })

  it.skip('prefers electionWinners when electionId prop is provided', async () => {
    readContractMock.mockImplementation((options: { functionName?: string }) => {
      if (options.functionName === 'getElectionWinners') {
        return { data: ref(['0x2']), error: ref(null) }
      }
      return { data: ref(['0x1']), isFetching: ref(false) }
    })

    const wrapper = mount(CurrentBoDSection, {
      props: { electionId: BigInt(5) },
      global: {
        stubs: {
          CardComponent: CardStub,
          UserComponentCol: UserColStub,
          CurrentBoDSection404: NotFoundStub
        }
      }
    })

    const users = wrapper.findAll('[data-test="user-col"]')
    expect(users).toHaveLength(1)
    expect(users[0].attributes('data-address')).toBe('0x2')
    expect(users[0].attributes('data-name')).toBe('Bob')
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
})
