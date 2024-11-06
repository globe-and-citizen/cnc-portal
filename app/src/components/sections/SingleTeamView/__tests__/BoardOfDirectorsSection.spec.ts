import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import BoardOfDirectorsSection from '@/components/sections/SingleTeamView/BoardOfDirectorsSection.vue'

import SkeletonLoading from '@/components/SkeletonLoading.vue'
import { ref } from 'vue'
import { createTestingPinia } from '@pinia/testing'
import type { TransactionResponse } from 'ethers'
import LoadingButton from '@/components/LoadingButton.vue'
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
  actionCount: ref<BigInt | null>(null),
  team: ref<Partial<Team> | null>(null),
  action: ref<Partial<Action> | null>(null),
  executeAddAction: vi.fn(),
  addAction: vi.fn(),
  isSuccess: ref(false),
  isConfirming: ref(false),
  error: ref(null)
}
vi.mock('@/composables/bod', async (importOriginal) => {
  const actual: Object = await importOriginal()
  return {
    ...actual,
    useAddAction: vi.fn(() => mockUseAddAction)
  }
})

// Mocking wagmi functions
vi.mock('@wagmi/vue', async (importOriginal) => {
  const actual: Object = await importOriginal()
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
  const actual: Object = await importOriginal()
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
      team: {
        expenseAccountAddress: '0xExpenseAccount',
        boardOfDirectors: [],
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

  it('should show loading skeleton when fetching bank owner', async () => {
    mockUseReadContract.isLoading.value = true
    const wrapper = createComponent({
      props: {
        team: { bankAddress: '0xBankAddress' }
      }
    })

    await wrapper.vm.$nextTick()
    expect(wrapper.findComponent(SkeletonLoading).exists()).toBe(true)
  })

  it('should display bank owner name when data is available', async () => {
    mockUseReadContract.data.value = ['0xOwnerAddress']
    const wrapper = createComponent({
      props: {
        team: { bankAddress: '0xBankAddress' }
      }
    })

    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('0xOwnerAddress')
  })

  it('should show loading button when transfer is pending', async () => {
    mockUseWriteContract.isPending.value = true
    const wrapper = createComponent({
      props: {
        team: { bankAddress: '0xBankAddress' }
      }
    })

    await wrapper.vm.$nextTick()
    expect(wrapper.findComponent(LoadingButton).exists()).toBeTruthy()
  })
})
