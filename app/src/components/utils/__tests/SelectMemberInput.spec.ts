import SelectMemberInput from '@/components/utils/SelectMemberInput.vue'
import UserComponent from '@/components/UserComponent.vue'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createTestingPinia } from '@pinia/testing'
import type { User } from '@/types'

// Mock data
const MOCK_USERS: User[] = [
  { id: '1', address: '0x1234567890123456789012345678901234567890', name: 'John Doe' },
  { id: '2', address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd', name: 'Jane Smith' },
  { id: '3', address: '0x9876543210987654321098765432109876543210', name: 'Bob Johnson' }
]

// Hoisted mocks
const { mockExecuteSearchUser, mockTeamStore, mockUseFocus, mockWatchDebounced } = vi.hoisted(
  () => ({
    mockExecuteSearchUser: vi.fn(),
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
  })
)

// Mocks
vi.mock('@/composables/useCustomFetch', () => ({
  useCustomFetch: vi.fn(() => ({
    get: () => ({
      json: () => ({
        execute: mockExecuteSearchUser,
        data: { value: { users: MOCK_USERS } },
        isFetching: false
      })
    })
  }))
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

const createWrapper = (props = {}) => {
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

  it('should clear input after selecting a member', async () => {
    wrapper = createWrapper()
    const input = wrapper.find(SELECTORS.input)

    await input.setValue('John')
    await nextTick()

    const userRow = wrapper.find(`[data-test="user-dropdown-${MOCK_USERS[0].address}"]`)
    await userRow.trigger('click')
    await nextTick()

    expect((input.element as HTMLInputElement).value).toBe('')
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

  it('should not emit selectMember when clicking disabled team member', async () => {
    wrapper = createWrapper({ disableTeamMembers: true })
    await nextTick()

    const teamMemberElement = wrapper.find(`[data-test="user-dropdown-${MOCK_USERS[1].address}"]`)
    await teamMemberElement.trigger('click')
    await nextTick()

    expect(wrapper.emitted('selectMember')).toBeFalsy()
  })

  it('should call executeSearchUser when watchers are triggered', async () => {
    type WatchCallback = (...args: unknown[]) => Promise<void>
    let watchDebouncedCallback: WatchCallback | null = null
    mockWatchDebounced.mockImplementation((_source, callback) => {
      watchDebouncedCallback = callback as WatchCallback
      return vi.fn()
    })

    wrapper = createWrapper({ onlyTeamMembers: false })
    await nextTick()

    if (watchDebouncedCallback) {
      await (watchDebouncedCallback as WatchCallback)()
    }

    expect(mockExecuteSearchUser).toHaveBeenCalled()
  })

  it('should not call executeSearchUser when onlyTeamMembers is true', async () => {
    type WatchCallback = (...args: unknown[]) => Promise<void>
    let watchDebouncedCallback: WatchCallback | null = null
    mockWatchDebounced.mockImplementation((_source, callback) => {
      watchDebouncedCallback = callback as WatchCallback
      return vi.fn()
    })

    wrapper = createWrapper({ onlyTeamMembers: true })
    await nextTick()

    mockExecuteSearchUser.mockClear()

    if (watchDebouncedCallback) {
      await (watchDebouncedCallback as WatchCallback)()
    }

    expect(mockExecuteSearchUser).not.toHaveBeenCalled()
  })
})
