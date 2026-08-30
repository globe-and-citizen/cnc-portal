import { beforeEach, describe, expect, it, vi } from 'vitest'
import ClaimHistoryMemberHeader from '@/components/sections/ClaimHistoryView/ClaimHistoryMemberHeader.vue'
import { mockRouterPush, mockTeamData, mockTeamStore, renderWithProviders } from '@/tests/mocks'

describe('ClaimHistoryMemberHeader', () => {
  const baseMembers = [...mockTeamData.members]

  const createWrapper = (memberAddress: string) =>
    renderWithProviders(ClaimHistoryMemberHeader, {
      props: {
        memberAddress: memberAddress as `0x${string}`
      }
    })

  beforeEach(() => {
    vi.clearAllMocks()
    mockRouterPush.mockClear()
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

  it('renders header but hides member selector when memberAddress is falsy', () => {
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
    expect(wrapper.findComponent({ name: 'USelectMenu' }).exists()).toBe(false)
  })

  it('routes to the selected member claim history from the searchable selector', async () => {
    const member = mockTeamData.members[0]
    const nextMember = mockTeamData.members[1]
    if (!member || !nextMember) throw new Error('Mock member data is required')

    const wrapper = createWrapper(member.address)
    const selector = wrapper.findComponent({ name: 'USelectMenu' })

    expect(selector.props('searchInput')).toEqual({ placeholder: 'Search members…' })
    expect(selector.props('filterFields')).toEqual(['label', 'description'])

    await selector.vm.$emit('update:modelValue', nextMember.address)

    expect(mockRouterPush).toHaveBeenCalledWith({
      name: 'payroll-history',
      params: { id: mockTeamStore.currentTeamId, memberAddress: nextMember.address }
    })
  })

  it('handles undefined memberAddress safely', () => {
    const wrapper = renderWithProviders(ClaimHistoryMemberHeader, {
      props: {
        memberAddress: undefined as unknown as `0x${string}`
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
