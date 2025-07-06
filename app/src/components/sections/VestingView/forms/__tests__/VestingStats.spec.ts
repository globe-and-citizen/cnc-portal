import { ref } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import VestingStats from '@/components/sections/VestingView/VestingStats.vue'
import { createPinia, setActivePinia } from 'pinia'
import { useToastStore } from '@/stores/__mocks__/useToastStore'
import { createConfig, http } from '@wagmi/core'
import { mainnet } from '@wagmi/core/chains'
import { parseUnits } from 'viem'

// Setup wagmi config
createConfig({
  chains: [mainnet],
  transports: {
    [mainnet.id]: http()
  }
})

// Mock states
const mocks = vi.hoisted(() => {
  return {
    mockUseReadContract: vi.fn().mockImplementation(({ functionName }) => {
      if (functionName === 'symbol') {
        return {
          data: ref('TKN'),
          error: ref(null),
          refetch: vi.fn()
        }
      }
      if (functionName === 'getTeamVestingsWithMembers') {
        return {
          data: ref([
            ['0xuser1', '0xuser2'],
            [
              {
                start: Math.floor(Date.now() / 1000).toString(),
                duration: (30 * 86400).toString(),
                cliff: '0',
                totalAmount: parseUnits('100', 6),
                released: parseUnits('30', 6),
                active: true
              }
            ]
          ]),
          error: ref(null),
          refetch: vi.fn()
        }
      }
      if (functionName === 'getTeamAllArchivedVestingsFlat') {
        return {
          data: ref([
            ['0xuser3'],
            [
              {
                start: Math.floor(Date.now() / 1000 - 86400).toString(),
                duration: (30 * 86400).toString(),
                cliff: '0',
                totalAmount: parseUnits('50', 6),
                released: parseUnits('50', 6),
                active: false
              }
            ]
          ]),
          error: ref(null),
          refetch: vi.fn()
        }
      }
      return {
        data: ref(null),
        error: ref(null),
        refetch: vi.fn()
      }
    })
  }
})

// Mock external dependencies
vi.mock('@wagmi/vue', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    useReadContract: mocks.mockUseReadContract,
    useAccount: () => ({ address: ref('0xMockedAddress') })
  }
})

vi.mock('@/stores', () => ({
  useTeamStore: () => ({
    currentTeam: {
      id: 1,
      teamContracts: [
        {
          type: 'InvestorsV1',
          address: '0x000000000000000000000000000000000000beef'
        }
      ]
    }
  })
}))

vi.mock('@/stores/useToastStore')

describe('VestingStats.vue', () => {
  beforeEach(() => {
    const pinia = createPinia()
    setActivePinia(pinia)
    vi.clearAllMocks()
  })

  const mountComponent = (props = {}) => {
    return mount(VestingStats, {
      props: {
        reloadKey: 0,
        ...props
      }
    })
  }

  describe('Rendering', () => {
    it('renders the component with table', async () => {
      const wrapper = mountComponent()
      await flushPromises()

      expect(wrapper.find('table').exists()).toBe(true)
      const headers = wrapper.findAll('th')
      expect(headers[0].text()).toBe('Token Symbol')
      expect(headers[1].text()).toBe('Total Vested')
      expect(headers[2].text()).toBe('Total Released')
      expect(headers[3].text()).toBe('Total Withdrawn')
    })

    it('displays correct token symbol', async () => {
      const wrapper = mountComponent()
      await flushPromises()

      const cells = wrapper.findAll('td')
      expect(cells[0].text()).toBe('TKN')
    })
  })

  describe('Data Fetching', () => {
    it('fetches and displays vesting data correctly', async () => {
      const wrapper = mountComponent()
      await flushPromises()

      const cells = wrapper.findAll('td')

      expect(cells[1].text()).toContain('150')
      expect(cells[2].text()).toContain('80')
      expect(cells[3].text()).toContain('20')
    })

    it('refetches data when reloadKey changes', async () => {
      const wrapper = mountComponent()
      await flushPromises()

      await wrapper.setProps({ reloadKey: 1 })
      await flushPromises()

      expect(mocks.mockUseReadContract).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: 'getTeamVestingsWithMembers'
        })
      )
      expect(mocks.mockUseReadContract).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: 'getTeamAllArchivedVestingsFlat'
        })
      )
    })
  })

  describe('Error Handling', () => {
    it('shows error toast when fetching archived vestings fails', async () => {
      const { addErrorToast } = useToastStore()

      mocks.mockUseReadContract.mockImplementationOnce(({}) => ({
        data: ref(null),
        error: ref(new Error('Failed to fetch')),
        refetch: vi.fn()
      }))

      //const wrapper = mountComponent()
      await flushPromises()

      expect(addErrorToast).toHaveBeenCalledWith('get archived  failed')
    })

    it('shows error toast when fetching active vestings fails', async () => {
      const { addErrorToast } = useToastStore()

      mocks.mockUseReadContract.mockImplementation(({ functionName }) => {
        if (functionName === 'getTeamVestingsWithMembers') {
          return {
            data: ref(null),
            error: ref(new Error('Failed to fetch')),
            refetch: vi.fn()
          }
        }
        return {
          data: ref(null),
          error: ref(null),
          refetch: vi.fn()
        }
      })

      //const wrapper = mountComponent()
      await flushPromises()

      expect(addErrorToast).toHaveBeenCalledWith('Add admin failed')
    })
  })

  describe('Calculations', () => {
    it('correctly calculates totals from both active and archived vestings', async () => {
      const wrapper = mountComponent()
      await flushPromises()

      const rows = wrapper.findAll('tr')
      const cells = rows[1].findAll('td') // First data row

      // Verify calculations
      expect(cells[1].text()).toContain('150') // Total Vested
      expect(cells[2].text()).toContain('80') // Total Released
      expect(cells[3].text()).toContain('20') // Total Withdrawn
    })
  })
})
