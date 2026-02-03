import SelectMemberInput from '@/components/utils/SelectMemberInput.vue'
import UserComponent from '@/components/UserComponent.vue'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick, ref } from 'vue'
import { createTestingPinia } from '@pinia/testing'
import type { User } from '@/types'
import { useSearchUsersQuery } from '@/queries/user.queries'

// Mock data
const MOCK_USERS: User[] = [
  { id: '1', address: '0x1234567890123456789012345678901234567890', name: 'John Doe' },
  { id: '2', address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd', name: 'Jane Smith' },
  { id: '3', address: '0x9876543210987654321098765432109876543210', name: 'Bob Johnson' }
]

// Hoisted mocks
const { mockTeamStore, mockUseFocus, mockWatchDebounced } = vi.hoisted(() => ({
  mockTeamStore: {
    currentTeam: {
      id: 1,
      name: 'Test Team',
      members: [
        { id: '2', address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd', name: 'Jane Smith' }
      ]
    }
  },
  mockUseFocus: vi.fn(() => ({ focused: { value: false } })),
  mockWatchDebounced: vi.fn()
}))

vi.mock('@/stores/teamStore', () => ({
  useTeamStore: vi.fn(() => mockTeamStore)
}))

vi.mock('@vueuse/core', () => ({
  useFocus: mockUseFocus,
  watchDebounced: mockWatchDebounced
}))

let wrapper: ReturnType<typeof mount>

const SELECTORS = {
  container: '[data-test="member-input"]',
  input: 'input[data-test="member-input"]',
  hint: '[data-test="select-member-hint"]',
  dropdown: '[data-test="user-dropdown"]',
  searchResults: '[data-test="user-search-results"]',
  userRow: '[data-test="user-row"]'
} as const

const createWrapper = (props = {}, mockQueryOverrides = {}) => {
  // Mock the search query
  const mockRefetch = vi.fn()
  vi.mocked(useSearchUsersQuery).mockReturnValue({
    data: ref({ users: MOCK_USERS }),
    isFetching: ref(false),
    refetch: mockRefetch,
    isLoading: ref(false),
    error: ref(null),
    isFetched: ref(true),
    isPending: ref(false),
    isSuccess: ref(true),
    ...mockQueryOverrides
  } as unknown as ReturnType<typeof useSearchUsersQuery>)

  return mount(SelectMemberInput, {
    props: {
      hiddenMembers: [],
      disableTeamMembers: false,
      ...props
    },
    global: {
      components: { UserComponent },
      plugins: [createTestingPinia({ createSpy: vi.fn })]
    }
  })
}

describe('SelectMemberInput', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    if (wrapper) wrapper.unmount()
    vi.useRealTimers()
  })

  it('should render correctly', () => {
    wrapper = createWrapper()
    expect(wrapper.exists()).toBeTruthy()
    expect(wrapper.find(SELECTORS.container).exists()).toBe(true)
  })

  it('should display users from query', async () => {
    wrapper = createWrapper()
    await nextTick()

    expect(wrapper.text()).toContain('John Doe')
    expect(wrapper.text()).toContain('Jane Smith')
    expect(wrapper.text()).toContain('Bob Johnson')
  })

  it('should handle multiple hidden members', async () => {
    const hiddenMembers = [MOCK_USERS[0], MOCK_USERS[1]]
    wrapper = createWrapper({ hiddenMembers })
    await nextTick()

    expect(wrapper.text()).not.toContain(MOCK_USERS[0].name)
    expect(wrapper.text()).not.toContain(MOCK_USERS[1].name)
    expect(wrapper.text()).toContain(MOCK_USERS[2].name)
  })

  it('should show only team members when onlyTeamMembers is true', async () => {
    wrapper = createWrapper({ onlyTeamMembers: true })
    await nextTick()

    expect(wrapper.text()).toContain('Jane Smith')
  })
})
