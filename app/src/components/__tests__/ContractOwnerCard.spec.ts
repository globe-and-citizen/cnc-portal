import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import ContractOwnerCard from '@/components/ContractOwnerCard.vue'
import { useTeamStore } from '@/stores'
import { mockWagmiCore } from '@/tests/mocks'

let mockLocalTeamStore: {
  currentTeam?: { members: unknown[] }
  getContractAddressByType?: (...args: unknown[]) => unknown
}

describe('ContractOwnerCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockLocalTeamStore = {
      currentTeam: {
        members: []
      },
      getContractAddressByType: vi.fn(() => undefined)
    }
    vi.mocked(useTeamStore).mockReturnValue(mockLocalTeamStore as ReturnType<typeof useTeamStore>)
  })

  const globalStubs = {
    AddressToolTip: {
      props: ['address'],
      template: '<span class="addr">{{ address }}</span>'
    }
  }

  it('shows Board of Directors when owner is the board address', async () => {
    const boardAddr = '0xBoard'
    mockLocalTeamStore.getContractAddressByType = vi.fn(() => boardAddr)
    mockLocalTeamStore.currentTeam = { members: [] }

    mockWagmiCore.readContract.mockResolvedValueOnce(boardAddr)

    const wrapper = mount(ContractOwnerCard, {
      props: { contractAddress: '0xContract' },
      global: { components: globalStubs }
    })

    await flushPromises()
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Board of Directors')
    expect(wrapper.text()).toContain(boardAddr)
    expect(mockWagmiCore.readContract).toHaveBeenCalled()
  })

  it('shows member info when owner is a team member', async () => {
    const ownerAddr = '0xMember'
    mockLocalTeamStore.currentTeam = {
      members: [{ address: ownerAddr, name: 'Alice', imageUrl: 'img' }]
    }
    mockLocalTeamStore.getContractAddressByType = vi.fn(() => undefined)

    mockWagmiCore.readContract.mockResolvedValueOnce(ownerAddr)

    const wrapper = mount(ContractOwnerCard, {
      props: { contractAddress: '0xContract' },
      global: { components: globalStubs }
    })

    await flushPromises()
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Alice')
    expect(wrapper.text()).toContain(ownerAddr)
  })

  it('falls back to address when owner is unknown', async () => {
    const ownerAddr = '0xUnknown'
    mockLocalTeamStore.currentTeam = { members: [] }
    mockLocalTeamStore.getContractAddressByType = vi.fn(() => undefined)

    mockWagmiCore.readContract.mockResolvedValueOnce(ownerAddr)

    const wrapper = mount(ContractOwnerCard, {
      props: { contractAddress: '0xContract' },
      global: { components: globalStubs }
    })

    await flushPromises()
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain(ownerAddr)
    expect(wrapper.text()).toContain(ownerAddr)
  })

  it('renders loading state when readContract fails', async () => {
    mockWagmiCore.readContract.mockRejectedValueOnce(new Error('fail'))

    const wrapper = mount(ContractOwnerCard, {
      props: { contractAddress: '0xContract' },
      global: { components: globalStubs }
    })

    await flushPromises()

    expect(wrapper.text()).toContain('Loading owner information...')
  })
})
