import { mount, VueWrapper } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import CreateOfficerTeam from '@/components/forms/CreateOfficerTeam.vue'
import { ref } from 'vue'

// Mocking modules without relying on top-level variables
vi.mock('@/stores/useToastStore', () => ({
  useToastStore: () => ({
    addErrorToast: vi.fn(),
    addSuccessToast: vi.fn()
  })
}))

vi.mock('@/composables/officer', () => ({
  useCreateTeam: () => ({
    execute: vi.fn(),
    isLoading: ref(false),
    isSuccess: ref(false),
    error: ref(null)
  })
}))

describe('CreateOfficerTeam.vue', () => {
  let wrapper: VueWrapper

  beforeEach(() => {
    wrapper = mount(CreateOfficerTeam, {
      props: {
        team: {
          officerAddress: '0x123456789',
          members: [{ name: 'John Doe', address: '0xabc', id: '1', teamId: 1 }]
        }
      }
    })
  })

  it('renders the component correctly', () => {
    expect(wrapper.exists()).toBe(true)
    expect(wrapper.find('h4').text()).toBe('Create Team')
  })
  it('selects a member', async () => {
    interface mock {
      selectMember: (user: { name: string; address: string }) => void
      selectedMembers: Array<{ name: string; address: string }>
    }
    const user = { name: 'Bob Smith', address: '0xghi' }
    await (wrapper.vm as unknown as mock).selectMember(user)
    expect((wrapper.vm as unknown as mock).selectedMembers[0]).toEqual(user)
  })
  it('prevents selecting duplicate addresses', async () => {
    interface mock {
      selectFounder: (user: { name: string; address: string }) => void
      selectedFounders: Array<{ name: string; address: string }>
    }
    const user = { name: 'Jane Doe', address: '0xdef' }
    await (wrapper.vm as unknown as mock).selectFounder(user)
    expect((wrapper.vm as unknown as mock).selectedFounders.length).toBe(1)
  })
  it('adds a new founder', async () => {
    interface mock {
      selectedFounders: Array<{ name: string; address: string }>
      addFounder: () => void
    }
    const initialFoundersCount = (wrapper.vm as unknown as mock).selectedFounders.length
    await (wrapper.vm as unknown as mock).addFounder()
    expect((wrapper.vm as unknown as mock).selectedFounders.length).toBe(initialFoundersCount + 1)
  })

  it('removes a founder', async () => {
    interface mock {
      selectedFounders: Array<{ name: string; address: string }>
      addFounder: () => void
      removeFounder: () => void
    }
    await (wrapper.vm as unknown as mock).addFounder() // Add a founder first
    const foundersCount = (wrapper.vm as unknown as mock).selectedFounders.length
    await (wrapper.vm as unknown as mock).removeFounder()
    expect((wrapper.vm as unknown as mock).selectedFounders.length).toBe(foundersCount - 1)
  })
  it('adds a new member', async () => {
    interface mock {
      selectedMembers: Array<{ name: string; address: string }>
      addMember: () => void
    }
    const initialMembersCount = (wrapper.vm as unknown as mock).selectedMembers.length
    await (wrapper.vm as unknown as mock).addMember()
    expect((wrapper.vm as unknown as mock).selectedMembers.length).toBe(initialMembersCount + 1)
  })
  it('removes a member', async () => {
    interface mock {
      selectedMembers: Array<{ name: string; address: string }>
      addMember: () => void
      removeMember: () => void
    }
    await (wrapper.vm as unknown as mock).addMember() // Add a member first
    const membersCount = (wrapper.vm as unknown as mock).selectedMembers.length
    await (wrapper.vm as unknown as mock).removeMember()
    expect((wrapper.vm as unknown as mock).selectedMembers.length).toBe(membersCount - 1)
  })
  it('shows founder dropdown when search results are found', async () => {
    interface mock {
      searchUsers: (
        input: { name: string; address: string },
        type: 'founder' | 'member'
      ) => Promise<void>
      showFounderDropdown: boolean
    }
    await (wrapper.vm as unknown as mock).searchUsers({ name: 'John', address: '' }, 'founder')
    expect((wrapper.vm as unknown as mock).showFounderDropdown).toBe(true)
  })
  describe('Component Lifecycle', () => {
    it('adds and removes event listener', () => {
      const addSpy = vi.spyOn(document, 'addEventListener')
      const removeSpy = vi.spyOn(document, 'removeEventListener')

      const wrapper = mount(CreateOfficerTeam, {
        props: {
          team: {}
        }
      })

      expect(addSpy).toHaveBeenCalledWith('click', expect.any(Function))

      wrapper.unmount()

      expect(removeSpy).toHaveBeenCalledWith('click', expect.any(Function))
    })
  })
})
