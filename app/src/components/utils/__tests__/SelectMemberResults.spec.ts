import SelectMemberResults from '@/components/utils/SelectMemberResults.vue'
import UserComponent from '@/components/UserComponent.vue'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import type { Member } from '@/types'

// Mock data
const MOCK_MEMBERS: Member[] = [
  {
    id: '1',
    address: '0x1234567890123456789012345678901234567890',
    name: 'Alice Johnson',
    teamId: 1
  },
  { id: '2', address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd', name: 'Bob Smith', teamId: 1 },
  {
    id: '3',
    address: '0x9876543210987654321098765432109876543210',
    name: 'Charlie Brown',
    teamId: 1
  }
]

const SELECTORS = {
  userSearchResults: '[data-test="user-search-results"]',
  userRow: '[data-test="user-row"]',
  userComponent: (address: string) => `[data-test="user-dropdown-${address}"]`
} as const

let wrapper: ReturnType<typeof mount>

const createWrapper = (props = {}) => {
  return mount(SelectMemberResults, {
    props: {
      members: [],
      ...props
    },
    global: {
      components: { UserComponent }
    }
  })
}

describe('SelectMemberResults', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    if (wrapper) wrapper.unmount()
  })

  it('should render nothing when members array is empty', () => {
    wrapper = createWrapper({ members: [] })

    expect(wrapper.find(SELECTORS.userSearchResults).exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Team Members')
  })

  it('should render title and members when members array has items', async () => {
    wrapper = createWrapper({ members: MOCK_MEMBERS })
    await nextTick()

    expect(wrapper.text()).toContain('Team Members')
    expect(wrapper.find(SELECTORS.userSearchResults).exists()).toBe(true)

    const rows = wrapper.findAll(SELECTORS.userRow)
    expect(rows.length).toBe(3)
  })

  it('should render UserComponent for each member', async () => {
    wrapper = createWrapper({ members: MOCK_MEMBERS })
    await nextTick()

    MOCK_MEMBERS.forEach((member) => {
      expect(wrapper.find(SELECTORS.userComponent(member.address)).exists()).toBe(true)
    })
  })

  it('should emit select event when a member row is clicked', async () => {
    wrapper = createWrapper({ members: MOCK_MEMBERS })
    await nextTick()

    const rows = wrapper.findAll(SELECTORS.userRow)
    expect(rows.length).toBeGreaterThan(0)

    await rows[0]!.trigger('click')

    expect(wrapper.emitted('select')).toBeTruthy()
    expect(wrapper.emitted('select')?.[0]).toEqual([MOCK_MEMBERS[0]])
  })

  it('should emit select event with correct member for each row', async () => {
    wrapper = createWrapper({ members: MOCK_MEMBERS })
    await nextTick()

    const rows = wrapper.findAll(SELECTORS.userRow)

    for (let i = 0; i < MOCK_MEMBERS.length; i++) {
      await rows[i]!.trigger('click')
    }

    expect(wrapper.emitted('select')).toBeTruthy()
    expect(wrapper.emitted('select')?.length).toBe(3)

    MOCK_MEMBERS.forEach((member, index) => {
      expect(wrapper.emitted('select')?.[index]).toEqual([member])
    })
  })

  it('should render single member correctly', async () => {
    const singleMember = [MOCK_MEMBERS[0]!]
    wrapper = createWrapper({ members: singleMember })
    await nextTick()

    expect(wrapper.text()).toContain('Team Members')
    expect(wrapper.findAll(SELECTORS.userRow).length).toBe(1)
    expect(wrapper.find(SELECTORS.userComponent(singleMember[0]!.address)).exists()).toBe(true)
  })

  it('should update when members prop changes', async () => {
    wrapper = createWrapper({ members: [] })
    await nextTick()

    expect(wrapper.find(SELECTORS.userSearchResults).exists()).toBe(false)

    await wrapper.setProps({ members: MOCK_MEMBERS })
    await nextTick()

    expect(wrapper.find(SELECTORS.userSearchResults).exists()).toBe(true)
    expect(wrapper.findAll(SELECTORS.userRow).length).toBe(3)
  })

  it('should apply correct CSS classes to member rows', async () => {
    wrapper = createWrapper({ members: MOCK_MEMBERS })
    await nextTick()

    const rows = wrapper.findAll(SELECTORS.userRow)
    rows.forEach((row) => {
      expect(row.classes()).toContain('cursor-pointer')
      expect(row.classes()).toContain('group')
    })
  })

  it('should apply correct CSS classes to UserComponent', async () => {
    wrapper = createWrapper({ members: MOCK_MEMBERS })
    await nextTick()

    MOCK_MEMBERS.forEach((member) => {
      const userComp = wrapper.find(SELECTORS.userComponent(member.address))
      expect(userComp.classes()).toContain('rounded-lg')
      expect(userComp.classes()).toContain('bg-white')
      expect(userComp.classes()).toContain('hover:bg-base-300')
    })
  })
})
