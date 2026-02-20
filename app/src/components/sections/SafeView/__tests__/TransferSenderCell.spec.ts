import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { defineComponent, nextTick, toValue } from 'vue'
import type { Address } from 'viem'
import type { User } from '@/types/user'

import '@/tests/setup/composables.setup'
import TransferSenderCell from '../TransferSenderCell.vue'
import { useGetUserQuery } from '@/queries/user.queries'
import { createMockQueryResponse, mockTeamData } from '@/tests/mocks/query.mock'

const mockedUseGetUserQuery = vi.mocked(useGetUserQuery)
type UserQueryReturn = ReturnType<typeof useGetUserQuery>
const buildUserQueryReturn = (data: Partial<User> | null, isLoading = false): UserQueryReturn =>
  createMockQueryResponse(data, isLoading) as UserQueryReturn

const PRIMARY_ADDRESS = mockTeamData.members[0]!.address as Address
const SECONDARY_ADDRESS = mockTeamData.members[1]!.address as Address
const PRIMARY_USER = mockTeamData.members[0]! as Partial<User>

const UserComponentStub = defineComponent({
  props: ['user'],
  template: `
    <div data-test="user-component">
      <span data-test="user-name">{{ user?.name }}</span>
      <span data-test="user-address">{{ user?.address }}</span>
      <span v-if="user?.imageUrl" data-test="user-image">{{ user.imageUrl }}</span>
    </div>
  `
})

const createWrapper = (address: Address = PRIMARY_ADDRESS): VueWrapper =>
  mount(TransferSenderCell, {
    props: { address },
    global: {
      stubs: {
        UserComponent: UserComponentStub
      }
    }
  })

beforeEach(() => {
  vi.clearAllMocks()
  mockedUseGetUserQuery.mockReturnValue(buildUserQueryReturn(PRIMARY_USER))
})

describe('TransferSenderCell', () => {
  it('renders a skeleton while the user query is loading', () => {
    mockedUseGetUserQuery.mockReturnValue(buildUserQueryReturn(null, true))

    const wrapper = createWrapper()

    expect(wrapper.find('.skeleton').exists()).toBe(true)
    expect(wrapper.find('[data-test="user-component"]').exists()).toBe(false)
  })

  it('renders user info when data is available', () => {
    const wrapper = createWrapper()

    expect(wrapper.find('[data-test="user-component"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="user-name"]').text()).toBe(mockTeamData?.members[0]?.name)
    expect(wrapper.find('[data-test="user-address"]').text()).toBe(PRIMARY_ADDRESS)
    expect(wrapper.find('[data-test="user-image"]').text()).toBe(mockTeamData?.members[0]?.imageUrl)
  })

  it('falls back to the address when the query returns partial data', () => {
    mockedUseGetUserQuery.mockReturnValue(buildUserQueryReturn({ address: PRIMARY_ADDRESS }))

    const wrapper = createWrapper()
    const userProps = wrapper.findComponent(UserComponentStub).props('user') as {
      name?: string
      address: Address
      imageUrl?: string
    }

    expect(userProps.name).toBeUndefined()
    expect(userProps.imageUrl).toBeUndefined()
    expect(userProps.address).toBe(PRIMARY_ADDRESS)
  })

  it('keeps the address reactive in query params when the prop changes', async () => {
    const wrapper = createWrapper()

    expect(mockedUseGetUserQuery.mock.calls.length).toBeGreaterThan(0)
    const callArgs = mockedUseGetUserQuery.mock.calls[0]![0]!
    const addressParam = callArgs.pathParams.address

    expect(toValue(addressParam)).toBe(PRIMARY_ADDRESS)

    await wrapper.setProps({ address: SECONDARY_ADDRESS })
    await nextTick()

    expect(toValue(addressParam)).toBe(SECONDARY_ADDRESS)
  })

  it('replaces the skeleton once loading resolves', async () => {
    const response = buildUserQueryReturn(PRIMARY_USER, true)
    mockedUseGetUserQuery.mockReturnValue(response)

    const wrapper = createWrapper()

    expect(wrapper.find('.skeleton').exists()).toBe(true)

    response.isLoading.value = false
    await nextTick()

    expect(wrapper.find('.skeleton').exists()).toBe(false)
    expect(wrapper.find('[data-test="user-component"]').exists()).toBe(true)
  })
})
