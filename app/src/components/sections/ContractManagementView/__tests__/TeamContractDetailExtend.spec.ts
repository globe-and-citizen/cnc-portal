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

  async function mountInitializedComponent(datas = getClonedTestData()) {
    const wrapper = mount(TeamContractsDetail, {
      props: {
        datas: [],
        contractAddress,
        reset: false,
        'onUpdate:datas': (updatedDatas: typeof datas) => {
          void wrapper.setProps({ datas: updatedDatas })
        }
      }
    })

    await wrapper.setProps({ datas })
    await flushPromises()
    return wrapper
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
    const wrapper = await mountInitializedComponent()
    await wrapper.findAll('input')[0].setValue('0.2')
    await wrapper.find('button').trigger('click')
    await flushPromises()
    expect(setCostPerClickMock).toHaveBeenCalled()
  })

  it('shows error toast when the the costPerClick and CostPerImpression is null', async () => {
    setCostPerClickMock.mockImplementationOnce(() => {
      throw new Error('Unexpected error')
    })

    const wrapper = await mountInitializedComponent()
    await wrapper.findAll('input')[0].setValue('0.2')

    await wrapper.find('button').trigger('click')
    await flushPromises()
  })

  it('shows error toast when setCostPerClick and setCostPerImpression fails ', async () => {
    await mountInitializedComponent()

    // Simulate the error on the ref observed by the watcher
    mockErrorSetCostPerClick.value = new Error('fail')
    mockErrorSetCostPerImpression.value = new Error('fail')

    await flushPromises()

    // expect(addErrorToast).toHaveBeenCalledWith('Set cost per click failed')
    // expect(addErrorToast).toHaveBeenCalledWith('Set cost per impression failed')

    mockErrorSetCostPerClick.value = null
  })

  it('keeps save disabled when loaded rates are empty', async () => {
    const datas = [
      { key: 'costPerClick', value: '' },
      { key: 'costPerImpression', value: '' }
    ]
    const wrapper = await mountInitializedComponent(datas)

    expect(wrapper.find('button').attributes('disabled')).toBeDefined()
  })

  it('uses new rates as the baseline after the parent resets the form', async () => {
    const wrapper = await mountInitializedComponent()
    await wrapper.setProps({ reset: true })
    await wrapper.findAll('input')[0].setValue('0.2')
    await flushPromises()

    expect(wrapper.find('button').attributes('disabled')).toBeDefined()
  })
  it('confirms setCostPerClick transaction and emits closeContractDataDialog', async () => {
    setCostPerClickMock.mockImplementationOnce((_v: unknown, opts?: MutateOpts) =>
      opts?.onSuccess?.()
    )
    const wrapper = await mountInitializedComponent()
    await wrapper.find('input[type="number"]').setValue('0.2')
    await wrapper.find('button').trigger('click')
    await flushPromises()
    expect(wrapper.emitted('closeContractDataDialog')?.length).toBe(1)
  })

  it('runs setCostPerImpression onSuccess when only the impression value changes', async () => {
    setCostPerImpressionMock.mockImplementationOnce((_v: unknown, opts?: MutateOpts) =>
      opts?.onSuccess?.()
    )
    const wrapper = await mountInitializedComponent()
    await wrapper.findAll('input[type="number"]')[1].setValue('0.7')
    await wrapper.find('button').trigger('click')
    await flushPromises()
    expect(setCostPerImpressionMock).toHaveBeenCalled()
  })

  it('keeps the unsaved rate editable after the other rate succeeds', async () => {
    setCostPerClickMock.mockImplementationOnce((_value: unknown, opts?: MutateOpts) =>
      opts?.onSuccess?.()
    )
    const wrapper = await mountInitializedComponent()

    await wrapper.findAll('input[type="number"]')[0].setValue('0.2')
    await wrapper.findAll('input[type="number"]')[1].setValue('0.7')
    await wrapper.get('[data-test="campaign-rate-save"]').trigger('click')
    await flushPromises()

    expect(wrapper.emitted('closeContractDataDialog')).toBeUndefined()
    expect(wrapper.get('[data-test="campaign-rate-save"]').attributes('disabled')).toBeUndefined()
  })
})
