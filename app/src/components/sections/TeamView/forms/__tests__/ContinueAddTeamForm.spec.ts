import { describe, it, vi, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import ContinueAddTeamForm from '@/components/sections/TeamView/forms/ContinueAddTeamForm.vue'
import type { Team } from '@/types/team'
import { createTestingPinia } from '@pinia/testing'
import DeployContractSection from '@/components/sections/TeamView/forms/DeployContractSection.vue'

// Hoisted mocks for Safe composables
const { mockUseSafe } = vi.hoisted(() => ({
  mockUseSafe: {
    deploySafe: vi.fn(),
    isBusy: { value: false }
  }
}))

// Create reactive ref for controlling isBusy state
const mockIsBusy = ref(false)

// Update the hoisted mock to use our reactive ref
mockUseSafe.isBusy = mockIsBusy

// Mock viem utilities
vi.mock('viem', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    encodeFunctionData: vi.fn(() => 'EncodedFunctionData'),
    isAddress: vi.fn(() => true),
    zeroAddress: '0x0000000000000000000000000000000000000000'
  }
})

// Mock the Safe composable
vi.mock('@/composables/safe', () => ({
  useSafeDeployment: vi.fn(() => ({
    deploySafe: mockUseSafe.deploySafe,
    isDeploying: mockIsBusy
  }))
}))

// Mock currency store to prevent Vue Query errors
vi.mock('@/stores/currencyStore', () => ({
  useCurrencyStore: vi.fn(() => ({
    getTokenInfo: vi.fn(() => ({
      id: 'native',
      name: 'Native Token',
      symbol: 'ETH',
      prices: []
    })),
    getTokenPrice: vi.fn(() => 0),
    localCurrency: ref({
      code: 'USD',
      name: 'US Dollar',
      symbol: '$'
    })
  }))
}))

// Mock constants - Use importOriginal to preserve BACKEND_URL
vi.mock('@/constant', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/constant')>()
  return {
    ...actual,
    BANK_BEACON_ADDRESS: '0x1111111111111111111111111111111111111111',
    BOD_BEACON_ADDRESS: '0x2222222222222222222222222222222222222222',
    PROPOSALS_BEACON_ADDRESS: '0x3333333333333333333333333333333333333333',
    EXPENSE_ACCOUNT_EIP712_BEACON_ADDRESS: '0x4444444444444444444444444444444444444444',
    CASH_REMUNERATION_EIP712_BEACON_ADDRESS: '0x5555555555555555555555555555555555555555',
    INVESTOR_V1_BEACON_ADDRESS: '0x6666666666666666666666666666666666666666',
    ELECTIONS_BEACON_ADDRESS: '0x7777777777777777777777777777777777777777',
    OFFICER_BEACON: '0x8888888888888888888888888888888888888888',
    USDC_ADDRESS: '0x9999999999999999999999999999999999999999',
    USDT_ADDRESS: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    validateAddresses: vi.fn(() => true),
    BACKEND_URL: actual.BACKEND_URL || 'http://localhost:3000' // Preserve or provide default
  }
})

// Mock utils
vi.mock('@/utils', () => ({
  log: {
    error: vi.fn()
  }
}))

const team = ref<Partial<Team>>({
  id: '1',
  name: 'Team 1',
  description: 'Team 1 description',
  ownerAddress: '0x4b6Bf5cD91446408290725879F5666dcd9785F62',
  officerAddress: '0x4b6Bf5cD91446408290725879F5666dcd9785F62'
})

describe.skip('ContinueAddTeamForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Reset reactive values
    mockIsBusy.value = false
  })

  it('should render the component', async () => {
    const wrapper = mount(ContinueAddTeamForm, {
      props: {
        team: team.value
      },
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })]
      }
    })

    expect(wrapper.exists()).toBe(true)

    const deployComponent = wrapper.findComponent(DeployContractSection)
    expect(wrapper.emitted('done')).toBeFalsy()

    await deployComponent.vm.$emit('contractDeployed')

    // Check if wrapper emit done event
    expect(wrapper.emitted('done')).toBeTruthy()
  })

  it('should emit done event when contract is deployed', async () => {
    const wrapper = mount(ContinueAddTeamForm, {
      props: { team: team.value },
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })]
      }
    })

    const deployComponent = wrapper.findComponent(DeployContractSection)

    expect(wrapper.emitted('done')).toBeFalsy()

    await deployComponent.vm.$emit('contractDeployed')

    expect(wrapper.emitted('done')).toBeTruthy()
    expect(wrapper.emitted('done')).toHaveLength(1)
  })
})
