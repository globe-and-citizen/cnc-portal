import SelectMemberInput from '@/components/utils/SelectMemberInput.vue'
import UserComponent from '@/components/UserComponent.vue'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick, ref } from 'vue'
import { createTestingPinia } from '@pinia/testing'
import type { User } from '@/types'
import { mockMembersData } from '@/tests/mocks'
import { useGetSearchUsersQuery } from '@/queries'

// Mock data
const MOCK_USERS: User[] = [
  { id: '1', address: '0x1234567890123456789012345678901234567890', name: 'John Doe' },
  { id: '2', address: '0x0987654321098765432109876543210987654321', name: 'Jane Smith' },
  { id: '3', address: '0x9876543210987654321098765432109876543210', name: 'Bob Johnson' }
]

// Hoisted mocks
const { mockUseFocus, mockWatchDebounced } = vi.hoisted(() => ({
  mockUseFocus: vi.fn(() => ({ focused: { value: true } })),
  mockWatchDebounced: vi.fn()
}))

vi.mock('@vueuse/core', () => ({
  useFocus: mockUseFocus,
  watchDebounced: mockWatchDebounced
}))

// vi.mock('@/lib/axios', () => ({
//   default: {
//     get: vi.fn()
//   }
// }))

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

const createWrapper = (props = {}, queryOverrides = {}) => {
  if (Object.keys(queryOverrides).length > 0) {
    vi.mocked(useGetSearchUsersQuery).mockReturnValueOnce({
      data: ref({ users: mockMembersData }),
      isFetching: ref(false),
      error: ref(null),
      refetch: vi.fn(),
      isLoading: ref(false),
      isPending: ref(false),
      isSuccess: ref(true),
      isFetched: ref(true),
      ...queryOverrides
    } as unknown as ReturnType<typeof useGetSearchUsersQuery>)
  }

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
    // vi.clearAllMocks()
    // vi.useFakeTimers()
    // lastFocusRef = null
    lastDebouncedCallback = null
    // useGetSearchUsersQuery
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

  it('should filter out hidden members', async () => {
    const hiddenMembers = [mockMembersData[2]!]
    vi.mocked(useGetSearchUsersQuery).mockReturnValueOnce({
      data: ref({ users: mockMembersData }),
      isFetching: ref(false),
      error: ref(null),
      refetch: vi.fn(),
      isLoading: ref(false),
      isPending: ref(false),
      isSuccess: ref(true),
      isFetched: ref(true)
    } as unknown as ReturnType<typeof useGetSearchUsersQuery>)
    wrapper = createWrapper({ hiddenMembers })
    await nextTick()

    console.log(wrapper.html())

    expect(
      wrapper.find(`[data-test="user-dropdown-${mockMembersData[0]!.address}"]`).exists()
    ).toBe(true)
    expect(
      wrapper.find(`[data-test="user-dropdown-${mockMembersData[1]!.address}"]`).exists()
    ).toBe(true)
    expect(
      wrapper.find(`[data-test="user-dropdown-${mockMembersData[2]!.address}"]`).exists()
    ).toBe(false)
  })

  it('should add loading class when fetching', () => {
    vi.mocked(useGetSearchUsersQuery).mockReturnValueOnce({
      data: ref(undefined),
      isFetching: ref(true),
      error: ref(null),
      refetch: vi.fn(),
      isLoading: ref(false),
      isPending: ref(false),
      isSuccess: ref(true),
      isFetched: ref(true)
    } as unknown as ReturnType<typeof useGetSearchUsersQuery>)
    wrapper = createWrapper({})
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
    wrapper = createWrapper(
      { currentSafeOwners: [MOCK_USERS[0]!.address] },
      { data: ref({ users: MOCK_USERS }) }
    )
    await nextTick()

    const rows = wrapper.findAll(SELECTORS.userRow)
    expect(rows.length).toBeGreaterThan(0)
    await rows[0]!.trigger('click')
    expect(wrapper.emitted('selectMember')).toBeFalsy()
    expect(wrapper.text()).toContain('Already a safe owner')
  })

  it('should block selection for existing team members when disabled', async () => {
    wrapper = createWrapper({ disableTeamMembers: true }, { data: ref({ users: MOCK_USERS }) })
    await nextTick()

    const rows = wrapper.findAll(SELECTORS.userRow)
    expect(rows.length).toBeGreaterThan(1)
    await rows[1]!.trigger('click')

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
    const inputEl = input.element as HTMLInputElement
    const focusSpy = vi.spyOn(inputEl, 'focus')

    const rows = wrapper.findAll(SELECTORS.userRow)
    expect(rows.length).toBeGreaterThan(2)
    await rows[2]!.trigger('click')
    await nextTick()

    expect(wrapper.emitted('selectMember')).toBeTruthy()
    expect((input.element as HTMLInputElement).value).toBe('')
    expect(mockRefetch).toHaveBeenCalledTimes(1)
    expect(focusSpy).toHaveBeenCalled()
  })

  it('should set search query to undefined when input is empty', async () => {
    const mockHook = vi.mocked(useGetSearchUsersQuery)
    mockHook.mockClear()
    mockHook.mockReturnValue({
      data: ref({ users: [] }),
      isFetching: ref(false),
      error: ref(null),
      refetch: vi.fn(),
      isLoading: ref(false),
      isPending: ref(false),
      isSuccess: ref(true),
      isFetched: ref(true)
    } as unknown as ReturnType<typeof useGetSearchUsersQuery>)

    wrapper = createWrapper()
    await nextTick()

    const callArgs = mockHook.mock.calls[0]![0] as {
      queryParams: { search: { value: string | undefined }; limit: number }
    }
    expect(callArgs.queryParams.search.value).toBeUndefined()
  })

  it('should return search query when input has value', async () => {
    const mockHook = vi.mocked(useGetSearchUsersQuery)
    mockHook.mockClear()
    mockHook.mockReturnValue({
      data: ref({ users: [] }),
      isFetching: ref(false),
      error: ref(null),
      refetch: vi.fn(),
      isLoading: ref(false),
      isPending: ref(false),
      isSuccess: ref(true),
      isFetched: ref(true)
    } as unknown as ReturnType<typeof useGetSearchUsersQuery>)

    wrapper = createWrapper()
    await nextTick()

    const callArgs = mockHook.mock.calls[0]![0] as {
      queryParams: { search: { value: string | undefined }; limit: number }
    }

    await wrapper.find(SELECTORS.input).setValue('john')
    await nextTick()

    expect(callArgs.queryParams.search.value).toBe('john')
  })

  it('should handle missing query data when onlyTeamMembers is false', async () => {
    wrapper = createWrapper({}, { data: ref(null) })
    await nextTick()

    expect(wrapper.find(SELECTORS.dropdown).exists()).toBe(false)
  })

  it('should treat null safe owners as empty list', async () => {
    wrapper = createWrapper(
      { currentSafeOwners: null as unknown as string[] },
      { data: ref({ users: MOCK_USERS }) }
    )
    await nextTick()

    const rows = wrapper.findAll(SELECTORS.userRow)
    console.log('Wrapper:', wrapper.html())
    expect(rows.length).toBeGreaterThan(0)
    await rows[0]!.trigger('click')

    expect(wrapper.emitted('selectMember')).toBeTruthy()
  })
})
