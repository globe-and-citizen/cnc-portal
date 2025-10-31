import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import ContractOwnerCard from '@/components/ContractOwnerCard.vue'

// Mock readContract from wagmi/core
const mockReadContract = vi.fn()
vi.mock('@wagmi/core', () => ({
  readContract: (...args: unknown[]) => mockReadContract(...(args as unknown[]))
}))

let mockTeamStore: {
  currentTeam?: { members: unknown[] }
  getContractAddressByType?: (...args: unknown[]) => unknown
}
vi.mock('@/stores', () => ({
  useTeamStore: () => mockTeamStore as unknown
}))

describe('ContractOwnerCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockTeamStore = {
      currentTeam: {
        members: []
      },
      getContractAddressByType: vi.fn(() => undefined)
    }
  })

  const globalStubs = {
    CardComponent: { template: '<div><slot /></div>' },
    UserAvatarComponent: {
      props: ['user'],
      template: '<div class="avatar">{{ user?.name || user?.address || "no" }}</div>'
    },
    AddressToolTip: {
      props: ['address'],
      template: '<span class="addr">{{ address }}</span>'
    }
  }

  it('shows Board of Directors when owner is the board address', async () => {
    const boardAddr = '0xBoard'
    mockTeamStore.getContractAddressByType = vi.fn(() => boardAddr)
    mockTeamStore.currentTeam = { members: [] }

    mockReadContract.mockResolvedValueOnce(boardAddr)

    const wrapper = mount(ContractOwnerCard, {
      props: { contractAddress: '0xContract' },
      global: { components: globalStubs }
    })

    await flushPromises()
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Board of Directors')
    expect(wrapper.text()).toContain(boardAddr)
    expect(mockReadContract).toHaveBeenCalled()
  })

  it('shows member info when owner is a team member', async () => {
    const ownerAddr = '0xMember'
    mockTeamStore.currentTeam = {
      members: [{ address: ownerAddr, name: 'Alice', imageUrl: 'img' }]
    }
    mockTeamStore.getContractAddressByType = vi.fn(() => undefined)

    mockReadContract.mockResolvedValueOnce(ownerAddr)

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
    mockTeamStore.currentTeam = { members: [] }
    mockTeamStore.getContractAddressByType = vi.fn(() => undefined)

    mockReadContract.mockResolvedValueOnce(ownerAddr)

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
    mockReadContract.mockRejectedValueOnce(new Error('fail'))

    const wrapper = mount(ContractOwnerCard, {
      props: { contractAddress: '0xContract' },
      global: { components: globalStubs }
    })

    await flushPromises()

    expect(wrapper.text()).toContain('Loading owner information...')
  })
})
