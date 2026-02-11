import SelectContractResults from '@/components/utils/SelectContractResults.vue'
import UserComponent from '@/components/UserComponent.vue'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import type { TeamContract } from '@/types'

// Mock data
const MOCK_CONTRACTS: TeamContract[] = [
  {
    id: '1',
    address: '0x1234567890123456789012345678901234567890',
    type: 'Safe Wallet',
    imageUrl: '/images/safe.png'
  },
  {
    id: '2',
    address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
    type: 'Token Contract',
    imageUrl: '/images/token.png'
  },
  {
    id: '3',
    address: '0x9876543210987654321098765432109876543210',
    type: 'NFT Contract',
    imageUrl: '/images/nft.png'
  }
]

const SELECTORS = {
  contractSearchResults: '[data-test="contract-search-results"]',
  contractRow: '[data-test="contract-row"]',
  contractComponent: (address: string) => `[data-test="contract-dropdown-${address}"]`
} as const

let wrapper: ReturnType<typeof mount>

const createWrapper = (props = {}) => {
  return mount(SelectContractResults, {
    props: {
      contracts: [],
      ...props
    },
    global: {
      components: { UserComponent }
    }
  })
}

describe('SelectContractResults', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    if (wrapper) wrapper.unmount()
  })

  it('should render nothing when contracts array is empty', () => {
    wrapper = createWrapper({ contracts: [] })

    expect(wrapper.find(SELECTORS.contractSearchResults).exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Contracts')
  })

  it('should render title and contracts when contracts array has items', async () => {
    wrapper = createWrapper({ contracts: MOCK_CONTRACTS })
    await nextTick()

    expect(wrapper.text()).toContain('Contracts')
    expect(wrapper.find(SELECTORS.contractSearchResults).exists()).toBe(true)

    const rows = wrapper.findAll(SELECTORS.contractRow)
    expect(rows.length).toBe(3)
  })

  it('should render UserComponent for each contract', async () => {
    wrapper = createWrapper({ contracts: MOCK_CONTRACTS })
    await nextTick()

    MOCK_CONTRACTS.forEach((contract) => {
      expect(wrapper.find(SELECTORS.contractComponent(contract.address)).exists()).toBe(true)
    })
  })

  it('should emit select event when a contract row is clicked', async () => {
    wrapper = createWrapper({ contracts: MOCK_CONTRACTS })
    await nextTick()

    const rows = wrapper.findAll(SELECTORS.contractRow)
    expect(rows.length).toBeGreaterThan(0)

    await rows[0]!.trigger('click')

    expect(wrapper.emitted('select')).toBeTruthy()
    expect(wrapper.emitted('select')?.[0]).toEqual([MOCK_CONTRACTS[0]])
  })

  it('should emit select event with correct contract for each row', async () => {
    wrapper = createWrapper({ contracts: MOCK_CONTRACTS })
    await nextTick()

    const rows = wrapper.findAll(SELECTORS.contractRow)

    for (let i = 0; i < MOCK_CONTRACTS.length; i++) {
      await rows[i]!.trigger('click')
    }

    expect(wrapper.emitted('select')).toBeTruthy()
    expect(wrapper.emitted('select')?.length).toBe(3)

    MOCK_CONTRACTS.forEach((contract, index) => {
      expect(wrapper.emitted('select')?.[index]).toEqual([contract])
    })
  })

  it('should render single contract correctly', async () => {
    const singleContract = [MOCK_CONTRACTS[0]!]
    wrapper = createWrapper({ contracts: singleContract })
    await nextTick()

    expect(wrapper.text()).toContain('Contracts')
    expect(wrapper.findAll(SELECTORS.contractRow).length).toBe(1)
    expect(wrapper.find(SELECTORS.contractComponent(singleContract[0]!.address)).exists()).toBe(
      true
    )
  })

  it('should update when contracts prop changes', async () => {
    wrapper = createWrapper({ contracts: [] })
    await nextTick()

    expect(wrapper.find(SELECTORS.contractSearchResults).exists()).toBe(false)

    await wrapper.setProps({ contracts: MOCK_CONTRACTS })
    await nextTick()

    expect(wrapper.find(SELECTORS.contractSearchResults).exists()).toBe(true)
    expect(wrapper.findAll(SELECTORS.contractRow).length).toBe(3)
  })

  it('should apply correct CSS classes to contract rows', async () => {
    wrapper = createWrapper({ contracts: MOCK_CONTRACTS })
    await nextTick()

    const rows = wrapper.findAll(SELECTORS.contractRow)
    rows.forEach((row) => {
      expect(row.classes()).toContain('cursor-pointer')
      expect(row.classes()).toContain('group')
    })
  })

  it('should apply correct CSS classes to UserComponent', async () => {
    wrapper = createWrapper({ contracts: MOCK_CONTRACTS })
    await nextTick()

    MOCK_CONTRACTS.forEach((contract) => {
      const userComp = wrapper.find(SELECTORS.contractComponent(contract.address))
      expect(userComp.classes()).toContain('rounded-lg')
      expect(userComp.classes()).toContain('bg-white')
      expect(userComp.classes()).toContain('hover:bg-base-300')
    })
  })

  it('should pass correct props to UserComponent', async () => {
    wrapper = createWrapper({ contracts: MOCK_CONTRACTS })
    await nextTick()

    const userComponents = wrapper.findAllComponents(UserComponent)

    expect(userComponents.length).toBe(3)

    userComponents.forEach((component, index) => {
      const contract = MOCK_CONTRACTS[index]!
      expect(component.props('user')).toEqual({
        name: contract.type,
        address: contract.address,
        imageUrl: contract.imageUrl
      })
    })
  })
})
