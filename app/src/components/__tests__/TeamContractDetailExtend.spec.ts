import { mount, flushPromises } from '@vue/test-utils'
//import type { ComponentPublicInstance } from 'vue'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import TeamContractsDetail from '@/components/TeamContractsDetail.vue'
import { useToastStore } from '@/stores/__mocks__/useToastStore'
import { ref } from 'vue'

const setCostPerClickMock = vi.fn().mockResolvedValue({ status: 1 })
const setCostPerImpressionMock = vi.fn().mockResolvedValue({ status: 1 })
export const mockErrorSetCostPerClick = ref<Error | null>(null)
export const mockErrorSetCostPerImpression = ref<Error | null>(null)

const mockUseWaitForTransactionReceipt = {
  data: ref({ contractAddress: '0xDEADBEEF' }),
  isSuccess: ref(true),
  isLoading: ref(false)
}

let useWriteCallCount = 0

//mock wagmi vue
vi.mock('@wagmi/vue', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    useWriteContract: vi.fn(() => {
      const current = useWriteCallCount++
      return {
        writeContract: current === 0 ? setCostPerClickMock : setCostPerImpressionMock,
        error: current === 0 ? mockErrorSetCostPerClick : mockErrorSetCostPerImpression,
        isPending: ref(false),
        data: ref(null)
      }
    }),
    useWaitForTransactionReceipt: vi.fn(() => mockUseWaitForTransactionReceipt)
  }
})

vi.mock('@/stores/useToastStore')
vi.mock('@/services/AddCampaignService', () => ({
  AddCampaignService: vi.fn().mockImplementation(() => ({}))
}))

describe('TeamContractsDetail.vue', () => {
  const contractAddress = '0xE55978c9f7B9bFc190B355d65e7F1dEc2F41D320'

  const originalTestData = [
    { key: 'costPerClick', value: '0.1' },
    { key: 'costPerImpression', value: '0.5' }
  ]

  function getClonedTestData() {
    return JSON.parse(JSON.stringify(originalTestData))
  }

  beforeEach(() => {
    const pinia = createPinia()
    setActivePinia(pinia)
    useWriteCallCount = 0
    vi.clearAllMocks()
    mockUseWaitForTransactionReceipt.data.value = { contractAddress: '0xDEADBEEF' }
    mockUseWaitForTransactionReceipt.isSuccess.value = true
    mockUseWaitForTransactionReceipt.isLoading.value = false
  })

  it('shows error toast if submit throws error', async () => {
    setCostPerClickMock.mockRejectedValueOnce(new Error('fail'))
    const datas = getClonedTestData()
    datas[0].value = '0.2'
    const wrapper = mount(TeamContractsDetail, {
      props: {
        datas,
        contractAddress,
        reset: true
      }
    })
    await flushPromises()
    wrapper.vm.initialized = true
    await wrapper.find('button').trigger('click')
    await flushPromises()
    expect(setCostPerClickMock).toHaveBeenCalled()
  })

  it('shows error toast when the the costPerClick and CostPerImpression is null', async () => {
    const { addErrorToast } = useToastStore()
    const datas = getClonedTestData()
    datas[0].value = '0.2'

    setCostPerClickMock.mockImplementationOnce(() => {
      throw new Error('Unexpected error')
    })

    const wrapper = mount(TeamContractsDetail, {
      props: {
        datas,
        contractAddress,
        reset: true
      }
    })

    wrapper.vm.initialized = true

    await wrapper.find('button').trigger('click')
    await flushPromises()

    expect(addErrorToast).toHaveBeenCalledWith(
      'An error occurred while updating the costs. Please try again.'
    )
  })

  it('shows error toast when setCostPerClick and setCostPerImpression fails ', async () => {
    const datas = getClonedTestData()
    const { addErrorToast } = useToastStore()
    const wrapper = mount(TeamContractsDetail, {
      props: {
        datas,
        contractAddress,
        reset: true
      }
    })

    await flushPromises()
    wrapper.vm.initialized = true

    // Simulate the error on the ref observed by the watcher
    mockErrorSetCostPerClick.value = new Error('fail')
    mockErrorSetCostPerImpression.value = new Error('fail')

    await flushPromises()

    expect(addErrorToast).toHaveBeenCalledWith('Set cost per click failed')
    expect(addErrorToast).toHaveBeenCalledWith('Set cost per impression failed')

    mockErrorSetCostPerClick.value = null
  })

  it('initializes original values when datas is updated and not yet initialized', async () => {
    const wrapper = mount(TeamContractsDetail, {
      props: {
        datas: [],
        contractAddress,
        reset: true
      }
    })

    wrapper.vm.initialized = false

    const newDatas = getClonedTestData()
    await wrapper.setProps({ datas: newDatas })

    await flushPromises()

    expect(wrapper.vm.initialized).toBe(true)
    expect(wrapper.vm.originalValues.costPerClick).toBe(0.1)
  })

  it('initializes with 0 if value is empty string (setProps style)', async () => {
    const wrapper = mount(TeamContractsDetail, {
      props: {
        datas: [],
        contractAddress,
        reset: true
      }
    })

    wrapper.vm.initialized = false

    const datas = [
      { key: 'costPerClick', value: '' },
      { key: 'costPerImpression', value: '' }
    ]
    await wrapper.setProps({ datas })
    await flushPromises()

    expect(wrapper.vm.originalValues.costPerClick).toBe(0)
    expect(wrapper.vm.originalValues.costPerImpression).toBe(0)
  })

  it('resets initialized when props.reset is true', async () => {
    const wrapper = mount(TeamContractsDetail, {
      props: {
        datas: getClonedTestData(),
        contractAddress,
        reset: false
      }
    })
    wrapper.vm.initialized = true
    await wrapper.setProps({ reset: true })
    expect(wrapper.vm.initialized).toBe(false)
  })
  it('confirms setCostPerClick transaction and emits closeContractDataDialog', async () => {
    const datas = getClonedTestData()
    const wrapper = mount(TeamContractsDetail, {
      props: {
        datas,
        contractAddress,
        reset: true
      }
    })
    await flushPromises()
    wrapper.vm.initialized = true
    await wrapper.find('input[type="number"]').setValue('0.2')
    await wrapper.find('button').trigger('click')
    // simulate confirmation
    mockUseWaitForTransactionReceipt.isLoading.value = true
    await wrapper.vm.$nextTick()
    mockUseWaitForTransactionReceipt.isLoading.value = false
    mockUseWaitForTransactionReceipt.isSuccess.value = true
    wrapper.vm.pendingTransactions--
    await wrapper.vm.$nextTick()
    await flushPromises()
    expect(wrapper.emitted('closeContractDataDialog')?.length).toBe(1)
  })
})
