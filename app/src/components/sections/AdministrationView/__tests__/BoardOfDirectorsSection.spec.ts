import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import BoardOfDirectorsSection from '@/components/sections/AdministrationView/BoardOfDirectorsSection.vue'

import { ref } from 'vue'
import { createTestingPinia } from '@pinia/testing'
import type { TransactionResponse } from 'ethers'
import type { Action, Team } from '@/types'

// Mock implementations
const mockUseReadContract = {
  data: ref<Array<string> | null>(['0xOwnerAddress']),
  isLoading: ref(false),
  error: ref(null),
  refetch: vi.fn()
}

const mockUseWriteContract = {
  writeContract: vi.fn(),
  error: ref(null),
  isPending: ref(false),
  data: ref(null)
}

const mockUseWaitForTransactionReceipt = {
  isLoading: ref(false),
  isSuccess: ref(false)
}
const mockUseAddAction = {
  loadingContract: ref(false),
  actionCount: ref<bigint | null>(null),
  team: ref<Partial<Team> | null>(null),
  action: ref<Partial<Action> | null>(null),
  executeAddAction: vi.fn(),
  addAction: vi.fn(),
  isSuccess: ref(false),
  isConfirming: ref(false),
  error: ref(null)
}
vi.mock('@/composables/bod', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    useAddAction: vi.fn(() => mockUseAddAction)
  }
})

// Mocking wagmi functions
vi.mock('@wagmi/vue', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    useReadContract: vi.fn(() => mockUseReadContract),
    useWriteContract: vi.fn(() => mockUseWriteContract),
    useWaitForTransactionReceipt: vi.fn(() => mockUseWaitForTransactionReceipt)
  }
})

const mockBankTransferOwnership = {
  transaction: ref<TransactionResponse | null>(null),
  isLoading: ref(false),
  error: ref<unknown>(null),
  isSuccess: false,
  execute: vi.fn()
}

vi.mock('@/composables/bank', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    useBankTransferOwnership: vi.fn(() => mockBankTransferOwnership)
  }
})
interface Props {
  team?: {}
}

interface ComponentOptions {
  props?: Props
  data?: () => Record<string, unknown>
  global?: Record<string, unknown>
}
const createComponent = ({ props = {}, data = () => ({}), global = {} }: ComponentOptions = {}) => {
  return mount(BoardOfDirectorsSection, {
    props: {
      // @ts-expect-error mock data
      team: {
        id: '1',
        name: 'Team Name',
        description: 'Team Description',
        members: [],
        teamContracts: [
          {
            address: '0xcontractaddress',
            admins: [],
            type: 'ExpenseAccountEIP712',
            deployer: '0xdeployeraddress'
          }
        ],
        ownerAddress: '0xOwner',
        ...props?.team
      },
      ...props
    },
    data,
    global: {
      plugins: [
        createTestingPinia({
          createSpy: vi.fn,
          initialState: {
            user: { address: '0xInitialUser' }
          }
        })
      ],
      ...global
    }
  })
}
describe('BoardOfDirectorsSection', () => {
  beforeEach(() => {
    // Reset mock data for each test case
    mockUseReadContract.data.value = null
    mockUseReadContract.isLoading.value = false
    mockUseReadContract.error.value = null
    mockUseWriteContract.isPending.value = false
    mockUseWaitForTransactionReceipt.isSuccess.value = false
  })

  it('should render board of directors table when data is available', async () => {
    mockUseReadContract.data.value = ['0xDirector1', '0xDirector2']
    const wrapper = createComponent()

    await wrapper.vm.$nextTick()
    expect(wrapper.find('#list-bod').exists()).toBe(true)
    expect(wrapper.find('table').exists()).toBe(true)
  })

  it('should show error message when no board of directors', async () => {
    mockUseReadContract.data.value = []
    const wrapper = createComponent()

    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain(
      'You must add board of directors by doing election voting from proposal'
    )
  })

  it('should render transfer ownership table', () => {
    const wrapper = createComponent()

    expect(wrapper.text()).toContain('Transfer Ownership (From Founders to Board of Directors)')
    expect(wrapper.find('table').exists()).toBe(true)
  })
})
