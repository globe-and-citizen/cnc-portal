import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import ClaimHistoryMemberHeader from '@/components/sections/ClaimHistoryView/ClaimHistoryMemberHeader.vue'
import { mockTeamData, mockTeamStore } from '@/tests/mocks'

describe('ClaimHistoryMemberHeader', () => {
  const baseMembers = [...mockTeamData.members]

  const createWrapper = (memberAddress: string) =>
    mount(ClaimHistoryMemberHeader, {
      props: {
        memberAddress: memberAddress as `0x${string}`
      },
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })]
      }
    })

  beforeEach(() => {
    vi.clearAllMocks()
    mockTeamStore.currentTeamMeta = {
      isPending: false,
      data: {
        ...mockTeamData,
        members: [...baseMembers]
      }
    }
  })

  it('renders member identity details for matching address', () => {
    const member = mockTeamData.members[0]
    if (!member) throw new Error('Mock member data is required')
    const wrapper = createWrapper(member.address.toUpperCase())

    expect(wrapper.find('[data-test="member-header"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="claim-user-name"]').text()).toContain(member.name)
    expect(wrapper.find('[data-test="claim-user-address"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="claim-user-image"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="claim-user-image-wrapper"]').exists()).toBe(true)
  })

  it('hides the image block when member has no imageUrl', () => {
    const member = mockTeamData.members[0]
    if (!member) throw new Error('Mock member data is required')
    mockTeamStore.currentTeamMeta = {
      isPending: false,
      data: {
        ...mockTeamData,
        members: [
          {
            ...member,
            imageUrl: ''
          },
          ...mockTeamData.members.slice(1)
        ]
      }
    }

    const wrapper = createWrapper(member.address)

    expect(wrapper.find('[data-test="member-header"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="claim-user-image-wrapper"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="claim-user-image"]').exists()).toBe(false)
  })

  it('does not render the header when member is not found', () => {
    const wrapper = createWrapper('0x0000000000000000000000000000000000000000')

    expect(wrapper.find('[data-test="member-header"]').exists()).toBe(false)
  })

  it('renders header but hides selector when memberAddress is falsy', () => {
    mockTeamStore.currentTeamMeta = {
      isPending: false,
      data: {
        ...mockTeamData,
        members: [
          {
            ...mockTeamData.members[0],
            address: ''
          }
        ]
      }
    }

    const wrapper = createWrapper('')

    expect(wrapper.find('[data-test="member-header"]').exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'SelectMemberItem' }).exists()).toBe(false)
  })

  it('handles undefined memberAddress safely', () => {
    const wrapper = mount(ClaimHistoryMemberHeader, {
      props: {
        memberAddress: undefined as unknown as `0x${string}`
      },
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })]
      }
    })

    expect(wrapper.find('[data-test="member-header"]').exists()).toBe(false)
  })

  it('handles missing team meta data with members fallback', () => {
    mockTeamStore.currentTeamMeta = undefined as unknown as typeof mockTeamStore.currentTeamMeta

    const wrapper = createWrapper('0x1234567890123456789012345678901234567890')

    expect(wrapper.find('[data-test="member-header"]').exists()).toBe(false)
  })
})
