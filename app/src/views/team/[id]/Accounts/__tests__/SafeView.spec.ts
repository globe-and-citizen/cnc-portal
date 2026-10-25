import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, shallowMount } from '@vue/test-utils'
import SafeView from '../SafeView.vue'
import { mockRouterReplace, mockTeamData, mockTeamStore, mockUserStore } from '@/tests/mocks'
import { mockUseContractBalance, makeTokenBalance } from '@/tests/mocks/composables.mock'
import { toValue } from 'vue'
import { useGetSafeBalancesQuery } from '@/queries/safeClient.queries'

const safeQueries = await vi.hoisted(async () => {
  const { ref } = await import('vue')
  return {
    bytecode: ref<string | undefined>(undefined),
    isLoading: ref(false),
    refetch: vi.fn()
  }
})

vi.mock('@/queries/safe.queries', () => ({
  useGetSafeBytecodeQuery: () => ({
    data: safeQueries.bytecode,
    isLoading: safeQueries.isLoading,
    refetch: safeQueries.refetch
  })
}))

describe('[US-SAFE-001] [US-SAFE-002] SafeView.vue', () => {
  beforeEach(() => {
    safeQueries.bytecode.value = undefined
    safeQueries.isLoading.value = false
  })

  it('[AC-US-SAFE-002-11] replaces the Safe sections with one notice when no contract exists at the address', () => {
    mockTeamStore.getContractAddressByType.mockReturnValue(
      '0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB'
    )
    safeQueries.bytecode.value = '0x'
    const wrapper = shallowMount(SafeView)

    expect(wrapper.find('[data-test="safe-missing-notice"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="safe-status-badge"]').attributes('color')).toBe('error')
    expect(wrapper.find('[data-test="safe-section-navigation"]').exists()).toBe(false)
    for (const name of ['SafeBalanceSection', 'SafeOwnersCard', 'SafeTransactions']) {
      expect(wrapper.findComponent({ name }).exists()).toBe(false)
    }
    const balanceParams = vi.mocked(useGetSafeBalancesQuery).mock.calls.at(-1)![0]
    expect(toValue(balanceParams.pathParams.safeAddress)).toBeUndefined()
    wrapper.unmount()
  })

  it('checks the chain again on retry', async () => {
    mockTeamStore.getContractAddressByType.mockReturnValue(
      '0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB'
    )
    safeQueries.bytecode.value = '0x'
    const wrapper = mount(SafeView, { global: { stubs: { AddressTooltip: true } } })

    await wrapper.find('[data-test="safe-missing-retry"]').trigger('click')
    await flushPromises()

    expect(safeQueries.refetch).toHaveBeenCalledOnce()
    wrapper.unmount()
  })

  it('[AC-US-SAFE-001-12] offers the team owner a replacement and opens the new Safe once it is registered', async () => {
    mockTeamStore.getContractAddressByType.mockReturnValue(
      '0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB'
    )
    mockUserStore.address = mockTeamData.ownerAddress
    mockTeamStore.currentTeam = mockTeamData
    safeQueries.bytecode.value = '0x'
    const wrapper = mount(SafeView, {
      global: { stubs: { AddressTooltip: true, SafeReplaceModal: true } }
    })
    const replaceModal = wrapper.findComponent({ name: 'SafeReplaceModal' })

    expect(replaceModal.exists()).toBe(true)
    replaceModal.vm.$emit('safe-replaced', '0xcccccccccccccccccccccccccccccccccccccccc')
    await flushPromises()

    const [target] = mockRouterReplace.mock.calls.at(-1) as unknown as [
      { name: string; params: { id: string; address: string } }
    ]
    expect(target).toMatchObject({ name: 'safe-account', params: { id: '1' } })
    expect(target.params.address.toLowerCase()).toBe('0xcccccccccccccccccccccccccccccccccccccccc')
    wrapper.unmount()
  })

  it('shows a member who is not the owner the missing Safe notice without replacement', () => {
    mockTeamStore.getContractAddressByType.mockReturnValue(
      '0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB'
    )
    mockUserStore.address = '0x0000000000000000000000000000000000000099'
    mockTeamStore.currentTeam = mockTeamData
    safeQueries.bytecode.value = '0x'
    const wrapper = mount(SafeView, {
      global: { stubs: { AddressTooltip: true, SafeReplaceModal: true } }
    })

    expect(wrapper.find('[data-test="safe-missing-notice"]').exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'SafeReplaceModal' }).exists()).toBe(false)
    wrapper.unmount()
  })

  it('holds the Safe sections until the chain answers, so no Safe service request starts first', () => {
    mockTeamStore.getContractAddressByType.mockReturnValue(
      '0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB'
    )
    safeQueries.isLoading.value = true
    const wrapper = shallowMount(SafeView)

    expect(wrapper.find('[data-test="safe-contract-loading"]').exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'SafeBalanceSection' }).exists()).toBe(false)
    wrapper.unmount()
  })

  it('keeps the Safe sections when a contract exists at the address', () => {
    mockTeamStore.getContractAddressByType.mockReturnValue(
      '0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB'
    )
    safeQueries.bytecode.value = '0x6080'
    const wrapper = shallowMount(SafeView)

    expect(wrapper.find('[data-test="safe-missing-notice"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="safe-status-badge"]').attributes('color')).toBe('success')
    expect(wrapper.findComponent({ name: 'SafeBalanceSection' }).exists()).toBe(true)
    wrapper.unmount()
  })

  it('reports a failed balance read separately and clears it when the existing query recovers', async () => {
    mockTeamStore.getContractAddressByType.mockReturnValue(
      '0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB'
    )
    mockUseContractBalance.hasData.value = false
    mockUseContractBalance.error.value = new Error('Safe Gateway unavailable')
    const wrapper = shallowMount(SafeView)
    const table = wrapper.findComponent({ name: 'TokenHoldingsSection' })

    expect(table.props('rows')).toEqual([])
    expect(table.props('hasError')).toBe(true)
    expect(table.props('isIncomplete')).toBe(false)

    mockUseContractBalance.error.value = null
    mockUseContractBalance.hasData.value = true
    await flushPromises()
    expect(table.props('hasError')).toBe(false)
    expect(table.props('rows').length).toBeGreaterThan(0)
    wrapper.unmount()
  })

  it('keeps the loading state visible while the team Safe is being resolved', () => {
    mockTeamStore.currentTeamId = mockTeamData.id
    mockTeamStore.currentTeamMeta = {
      isPending: true,
      data: undefined
    } as typeof mockTeamStore.currentTeamMeta
    mockTeamStore.getContractAddressByType.mockReturnValue(undefined)

    const wrapper = shallowMount(SafeView)

    expect(wrapper.find('[data-test="safe-loading-state"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="safe-setup-view"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="safe-wallet-view"]').exists()).toBe(false)
  })

  it('shows the setup only after a team without a Safe has loaded', () => {
    mockTeamStore.currentTeamId = mockTeamData.id
    mockTeamStore.currentTeamMeta = {
      isPending: false,
      data: mockTeamData
    }
    mockTeamStore.getContractAddressByType.mockReturnValue(undefined)

    const wrapper = shallowMount(SafeView)

    expect(wrapper.find('[data-test="safe-setup-view"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="safe-loading-state"]').exists()).toBe(false)
  })

  it('[AC-US-SAFE-002-05] uses the registered Safe address for wallet reporting', () => {
    mockUseContractBalance.balances.value = [
      makeTokenBalance({ token: { name: 'Polygon', symbol: 'POL' }, amount: 0, usdPrice: 0.2 })
    ]
    const safeAddress = '0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB'
    mockTeamStore.getContractAddressByType.mockReturnValue(safeAddress)

    const wrapper = shallowMount(SafeView)

    expect(wrapper.find('[data-test="safe-wallet-view"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="safe-setup-view"]').exists()).toBe(false)
    expect(wrapper.findComponent({ name: 'SafeBalanceSection' }).props('address')).toBe(safeAddress)
    expect(wrapper.findComponent({ name: 'TokenHoldingsSection' }).props('compact')).toBe(true)
    const rows = wrapper.findComponent({ name: 'TokenHoldingsSection' }).props('rows')
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ token: { name: 'Polygon', symbol: 'POL' }, quantity: '0' })
    expect(wrapper.findComponent({ name: 'SafeOwnersCard' }).props('address')).toBe(safeAddress)
  })

  it('updates the existing holdings table when query data changes after mounting', async () => {
    mockTeamStore.getContractAddressByType.mockReturnValue(
      '0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB'
    )
    mockUseContractBalance.balances.value = [
      makeTokenBalance({ token: { name: 'Polygon', symbol: 'POL' }, amount: 1, usdPrice: 0.2 })
    ]
    const wrapper = shallowMount(SafeView)
    const table = wrapper.findComponent({ name: 'TokenHoldingsSection' })
    expect(table.props('rows')[0]).toMatchObject({ quantity: '1', balance: 0.2 })
    mockUseContractBalance.balances.value = [
      makeTokenBalance({ token: { name: 'Polygon', symbol: 'POL' }, amount: 2, usdPrice: 0.2 })
    ]
    await flushPromises()
    expect(table.props('rows')[0]).toMatchObject({ quantity: '2', balance: 0.4 })
    mockUseContractBalance.balances.value = []
    await flushPromises()
    expect(table.props('rows')).toEqual([])
    wrapper.unmount()
  })
})
