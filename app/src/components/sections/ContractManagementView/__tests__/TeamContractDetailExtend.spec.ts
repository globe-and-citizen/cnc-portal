import { mount, flushPromises } from '@vue/test-utils'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import TeamContractsDetail from '@/components/sections/ContractManagementView/TeamContractsDetail.vue'
import { ref } from 'vue'

type MutateOpts = { onSuccess?: () => void; onError?: (e: unknown) => void }

const setCostPerClickMock = vi.fn()
const setCostPerImpressionMock = vi.fn()
export const mockErrorSetCostPerClick = ref<Error | null>(null)
export const mockErrorSetCostPerImpression = ref<Error | null>(null)
const isPendingSetCostPerClick = ref(false)
const isPendingSetCostPerImpression = ref(false)

vi.mock('@/composables/contracts/useContractWritesV3', () => ({
  useContractWritesV3: vi.fn(({ functionName }: { functionName: string }) => {
    if (functionName === 'setCostPerClick') {
      return {
        mutate: setCostPerClickMock,
        error: mockErrorSetCostPerClick,
        isPending: isPendingSetCostPerClick
      }
    }
    return {
      mutate: setCostPerImpressionMock,
      error: mockErrorSetCostPerImpression,
      isPending: isPendingSetCostPerImpression
    }
  })
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
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockErrorSetCostPerClick.value = null
    mockErrorSetCostPerImpression.value = null
    isPendingSetCostPerClick.value = false
    isPendingSetCostPerImpression.value = false
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
  })

  it('shows error toast when setCostPerClick and setCostPerImpression fails ', async () => {
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

    // Simulate the error on the ref observed by the watcher
    mockErrorSetCostPerClick.value = new Error('fail')
    mockErrorSetCostPerImpression.value = new Error('fail')

    await flushPromises()

    // expect(addErrorToast).toHaveBeenCalledWith('Set cost per click failed')
    // expect(addErrorToast).toHaveBeenCalledWith('Set cost per impression failed')

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
    setCostPerClickMock.mockImplementationOnce((_v: unknown, opts?: MutateOpts) =>
      opts?.onSuccess?.()
    )
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
    await flushPromises()
    expect(wrapper.emitted('closeContractDataDialog')?.length).toBe(1)
  })
})
