import SelectMemberInput from '@/components/utils/SelectMemberInput.vue'
import UserComponent from '@/components/UserComponent.vue'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick, ref } from 'vue'
import { createTestingPinia } from '@pinia/testing'
import type { User } from '@/types'
import { useQuery } from '@tanstack/vue-query'

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
    },
    currentTeamMeta: {
      data: {
        members: [
          { id: '2', address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd', name: 'Jane Smith' }
        ]
      }
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

vi.mock('@tanstack/vue-query', () => ({
  useQuery: vi.fn()
}))

let wrapper: ReturnType<typeof mount>
let lastFocusRef: ReturnType<typeof ref> | null = null
let lastDebouncedCallback: (() => Promise<void> | void) | null = null

const SELECTORS = {
  container: '[data-test="member-input"]',
  input: 'input[data-test="member-input"]',
  hint: '[data-test="select-member-hint"]',
  dropdown: '[data-test="user-dropdown"]',
  searchResults: '[data-test="user-search-results"]',
  userRow: '[data-test="user-row"]'
} as const

const createWrapper = (props = {}, mockQueryOverrides = {}) => {
  const mockRefetch = vi.fn()
  vi.mocked(useQuery).mockReturnValue({
    data: ref({ users: MOCK_USERS }),
    isFetching: ref(false),
    refetch: mockRefetch,
    ...mockQueryOverrides
  } as unknown as ReturnType<typeof useQuery>)

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
    lastFocusRef = null
    lastDebouncedCallback = null
    vi.mocked(mockUseFocus).mockImplementation(() => {
      lastFocusRef = ref(false)
      return { focused: lastFocusRef }
    })
    vi.mocked(mockWatchDebounced).mockImplementation((_, callback) => {
      lastDebouncedCallback = callback as () => Promise<void> | void
    })
  })

  afterEach(() => {
    if (wrapper) wrapper.unmount()
    vi.useRealTimers()
  })

  it('should add loading class when fetching', () => {
    wrapper = createWrapper({}, { isFetching: ref(true) })
    expect(wrapper.find(SELECTORS.container).classes()).toContain('animate-pulse')
  })

  it('should refetch on debounced input when not limited to team members', async () => {
    const mockRefetch = vi.fn()
    wrapper = createWrapper({}, { refetch: mockRefetch })

    await wrapper.find(SELECTORS.input).setValue('john')
    await lastDebouncedCallback!()

    expect(mockRefetch).toHaveBeenCalledTimes(1)
  })

  it('should not refetch on debounced input when onlyTeamMembers is true', async () => {
    const mockRefetch = vi.fn()
    wrapper = createWrapper({ onlyTeamMembers: true }, { refetch: mockRefetch })

    await wrapper.find(SELECTORS.input).setValue('john')
    await lastDebouncedCallback!()

    expect(mockRefetch).not.toHaveBeenCalled()
  })

  it('should block selection for safe owners', async () => {
    wrapper = createWrapper({ currentSafeOwners: [MOCK_USERS[0].address] })
    await nextTick()

    await wrapper.findAll(SELECTORS.userRow)[0].trigger('click')
    expect(wrapper.emitted('selectMember')).toBeFalsy()
    expect(wrapper.text()).toContain('Already a safe owner')
  })

  it('should block selection for existing team members when disabled', async () => {
    wrapper = createWrapper({ disableTeamMembers: true })
    await nextTick()

    const teamRow = wrapper.findAll(SELECTORS.userRow)[1]
    await teamRow.trigger('click')

    expect(wrapper.emitted('selectMember')).toBeFalsy()
    expect(wrapper.text()).toContain('Already in your team')
  })

  it('should emit selection for eligible members and reset input', async () => {
    const mockRefetch = vi.fn()
    wrapper = createWrapper({ showOnFocus: true }, { refetch: mockRefetch })
    await nextTick()

    lastFocusRef!.value = true
    await nextTick()

    const input = wrapper.find(SELECTORS.input)
    const focusSpy = vi.spyOn(input.element, 'focus')

    await wrapper.findAll(SELECTORS.userRow)[2].trigger('click')
    await nextTick()

    expect(wrapper.emitted('selectMember')).toBeTruthy()
    expect((input.element as HTMLInputElement).value).toBe('')
    expect(mockRefetch).toHaveBeenCalledTimes(1)
    expect(focusSpy).toHaveBeenCalled()
  })
})
