import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import SelectMemberInput from '../SelectMemberInput.vue'
import { useGetSearchUsersQuery } from '@/queries'
import { mockTeamStore } from '@/tests/mocks'
import type { Member, User } from '@/types'

const TEAM_MEMBER: User = {
  id: 'team-member',
  address: '0x1111111111111111111111111111111111111111',
  name: 'Team member'
}
const EXTERNAL_USER: User = {
  id: 'external-user',
  address: '0x2222222222222222222222222222222222222222',
  name: 'External user'
}
const refetchUsers = vi.fn()
let wrapper: ReturnType<typeof mount> | undefined

const UInputStub = defineComponent({
  name: 'UInput',
  props: ['modelValue', 'disabled'],
  emits: ['update:modelValue'],
  setup(_, { expose }) {
    expose({ focus: () => undefined, inputRef: null })
    return () => h('input')
  }
})

const stubs = {
  UInput: UInputStub,
  Input: UInputStub,
  UTooltip: {
    name: 'UTooltip',
    props: ['text'],
    template: '<div><slot /></div>'
  },
  UserIdentity: {
    name: 'UserIdentity',
    props: ['user'],
    template: '<div>{{ user.name }}</div>'
  }
}

function mountInput(memberScope: 'all-users' | 'team-members' | 'non-team-members') {
  wrapper = mount(SelectMemberInput, {
    props: { hiddenMembers: [], memberScope },
    global: { stubs }
  })
  return wrapper
}

describe('SelectMemberInput', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockTeamStore.currentTeamMeta.data = {
      ...mockTeamStore.currentTeam,
      members: [TEAM_MEMBER as Member]
    } as typeof mockTeamStore.currentTeamMeta.data
    vi.mocked(useGetSearchUsersQuery).mockReturnValue({
      data: ref({ users: [TEAM_MEMBER, EXTERNAL_USER] }),
      isFetching: ref(false),
      refetch: refetchUsers
    } as ReturnType<typeof useGetSearchUsersQuery>)
  })

  afterEach(() => wrapper?.unmount())

  it('shows only team members when its scope is team members', () => {
    const wrapper = mountInput('team-members')

    expect(wrapper.findAll('[data-test="user-row"]')).toHaveLength(1)
    expect(wrapper.text()).toContain('Team member')
    expect(wrapper.text()).not.toContain('External user')
  })

  it('keeps existing team members unavailable when its scope excludes them', async () => {
    const wrapper = mountInput('non-team-members')
    const rows = wrapper.findAll('[data-test="user-row"]')

    expect(rows).toHaveLength(2)

    await rows[0]?.trigger('click')
    expect(wrapper.emitted('selectMember')).toBeFalsy()

    await rows[1]?.trigger('click')
    expect(wrapper.emitted('selectMember')).toEqual([[EXTERNAL_USER]])
  })

  it('allows every searched user when its scope is all users', async () => {
    const wrapper = mountInput('all-users')
    const rows = wrapper.findAll('[data-test="user-row"]')

    expect(rows).toHaveLength(2)

    await rows[0]?.trigger('click')
    expect(wrapper.emitted('selectMember')).toEqual([[TEAM_MEMBER]])
  })
})
