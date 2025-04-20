import { mount, flushPromises } from '@vue/test-utils'
//import type { ComponentPublicInstance } from 'vue'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import TeamContractsDetail from '@/components/TeamContractsDetail.vue'
import AdCampaignArtifact from '@/artifacts/abi/AdCampaignManager.json'
const campaignAbi = AdCampaignArtifact.abi
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
  const testData = [
    { key: 'costPerClick', value: '0.1' },
    { key: 'costPerImpression', value: '0.5' }
  ]

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

  it('renders table headers and  rows correctly based on key types', () => {
    const datas = [
      { key: 'costPerClick', value: '0.1' }, // should render input
      { key: 'bankAddress', value: '0xABC' }, // should render AddressToolTip
      { key: 'status', value: 'active' } // should render plain text
    ]
    const wrapper = mount(TeamContractsDetail, {
      props: { datas, contractAddress, reset: true }
    })
    // Check that table headers exist and are correct
    const headers = wrapper.findAll('th')
    expect(headers[0].text()).toBe('#')
    expect(headers[1].text()).toBe('Name')
    expect(headers[2].text()).toBe('Value')
    const rows = wrapper.findAll('tbody tr')
    // Ligne costPerClick
    const inputCell = rows[0].find('input')
    expect(inputCell.exists()).toBe(true)
    expect(rows[0].text()).toContain('ETH')
    // Ligne bankAddress
    const addressCell = rows[1].findComponent({ name: 'AddressToolTip' })
    expect(addressCell.exists()).toBe(true)
    // Ligne status
    expect(rows[2].text()).toContain('active')
  })

  it('calls submit and reads props.datas', async () => {
    const datas = [
      { key: 'costPerClick', value: '0.2' },
      { key: 'costPerImpression', value: '0.4' }
    ]
    const wrapper = mount(TeamContractsDetail, {
      props: {
        datas,
        contractAddress,
        reset: true
      }
    })
    wrapper.vm.initialized = true
    await flushPromises()
    const button = wrapper.find('button')
    await button.trigger('click')
    await flushPromises()
    expect(setCostPerClickMock).toHaveBeenCalled()
    expect(setCostPerImpressionMock).toHaveBeenCalled()
  })

  it('renders table rows based on props', () => {
    const wrapper = mount(TeamContractsDetail, {
      props: {
        datas: testData,
        contractAddress: contractAddress,
        reset: true
      }
    })
    // Ensure that the number of rows matches the testData length
    const rows = wrapper.findAll('tbody tr')
    expect(rows.length).toBe(testData.length)
    // Check first row values
    expect(rows[0].find('th').text()).toBe('1') // Index
    expect(rows[0].findAll('td')[0].text()).toBe('costPerClick') // Name
    const firstRowInput = rows[0].findAll('td')[1].find('input')
    expect(firstRowInput.element.value).toBe('0.1') // Value
    expect(rows[0].findAll('td')[1].text()).toContain('ETH') // Currency
    // Check second row values
    expect(rows[1].find('th').text()).toBe('2') // Index
    expect(rows[1].findAll('td')[0].text()).toBe('costPerImpression') // Name
    const secondRowInput = rows[1].findAll('td')[1].find('input')
    expect(secondRowInput.element.value).toBe('0.5') // Value
    expect(rows[1].findAll('td')[1].text()).toContain('ETH') // Currency
  })

  it('renders table rows correctly for valid, empty, and null data', async () => {
    const wrapperValid = mount(TeamContractsDetail, {
      props: {
        datas: [
          { key: 'costPerClick', value: '0.1' },
          { key: 'costPerImpression', value: '0.5' }
        ],
        contractAddress,
        reset: true
      }
    })
    const rowsValid = wrapperValid.findAll('tbody tr')
    expect(rowsValid.length).toBe(2)
    expect(rowsValid[0].find('th').text()).toBe('1')
    expect(rowsValid[0].text()).toContain('costPerClick')
    expect(rowsValid[1].text()).toContain('costPerImpression')
    const wrapperEmpty = mount(TeamContractsDetail, {
      props: {
        datas: [],
        contractAddress,
        reset: true
      }
    })
    const rowsEmpty = wrapperEmpty.findAll('tbody tr')
    expect(rowsEmpty.length).toBe(0)

    const wrapperNull = mount(TeamContractsDetail, {
      props: {
        datas: null as unknown as { key: string; value: string }[],
        contractAddress,
        reset: true
      }
    })
    const rowsNull = wrapperNull.findAll('tbody tr')
    expect(rowsNull.length).toBe(0)
  })
  it('calls setCostPerClick and setCostPerImpression when save button is clicked with changed values', async () => {
    const cloned = getClonedTestData()

    let updatedDatas = [...cloned]

    const wrapper = mount(TeamContractsDetail, {
      props: {
        datas: cloned,
        contractAddress,
        reset: true,
        // Simulate two-way binding
        'onUpdate:datas': (newValue: typeof cloned) => {
          updatedDatas = newValue
          wrapper.setProps({ datas: updatedDatas }) // simulate parent prop update
        }
      }
    })
    await flushPromises()
    wrapper.vm.initialized = true
    // Modify input values to simulate user editing them
    const inputCostPerClick = wrapper.findAll('input')[0]
    await inputCostPerClick.setValue('0.2')
    const inputCostPerImpression = wrapper.findAll('input')[1]
    await inputCostPerImpression.setValue('0.4')
    // Click the save button
    await wrapper.find('button').trigger('click')
    // Wait for Vue to process updates
    await flushPromises()
    // Check that the correct functions were called
    expect(setCostPerClickMock).toHaveBeenCalledWith({
      address: contractAddress,
      abi: campaignAbi,
      functionName: 'setCostPerClick',
      args: [200000000000000000n]
    })
    expect(setCostPerImpressionMock).toHaveBeenCalledWith({
      address: contractAddress,
      abi: campaignAbi,
      functionName: 'setCostPerImpression',
      args: [400000000000000000n]
    })
    // expect(setCostPerClickMock).toHaveBeenCalledWith(contractAddress, '0.2')
    // expect(setCostPerImpressionMock).toHaveBeenCalledWith(contractAddress, '0.4')
  })

  it('shows error toast and does not call setCostPerClick if costPerClick is zero or negative', async () => {
    const { addErrorToast } = useToastStore()
    const datas = getClonedTestData()
    datas[0].value = '2' // costPerClick = 0
    const wrapper = mount(TeamContractsDetail, {
      props: {
        datas: [], // empty at mount
        contractAddress,
        reset: true
      }
    })

    await flushPromises()

    // now simulate reactive update to trigger the watcher
    await wrapper.setProps({ datas })
    const inputCostPerClick = wrapper.findAll('input')[0]
    await inputCostPerClick.setValue('0')
    await flushPromises()
    wrapper.vm.initialized = true
    await wrapper.find('button').trigger('click')
    await flushPromises()
    expect(addErrorToast).toHaveBeenCalledWith('Cost per click should be greater than 0')
    expect(setCostPerClickMock).not.toHaveBeenCalled()
  })

  it('does not call update functions when values have not changed', async () => {
    const datas = [
      { key: 'costPerClick', value: '0.1' },
      { key: 'costPerImpression', value: '0.5' }
    ]
    const wrapper = mount(TeamContractsDetail, {
      props: {
        datas,
        contractAddress,
        reset: true
      }
    })
    await flushPromises()
    wrapper.vm.initialized = true
    wrapper.vm.originalValues = {
      costPerClick: 0.1,
      costPerImpression: 0.5
    }
    wrapper.vm.originalCostPerClick = 0.1
    wrapper.vm.originalCostPerImpression = 0.5
    // Submit sans modification
    await wrapper.find('button').trigger('click')
    await flushPromises()
    expect(setCostPerClickMock).not.toHaveBeenCalled()
    expect(setCostPerImpressionMock).not.toHaveBeenCalled()
  })

  it('emits update:datas when inputs are changed', async () => {
    const wrapper = mount(TeamContractsDetail, {
      props: {
        datas: testData,
        contractAddress,
        reset: true
      }
    })
    const inputs = wrapper.findAll('input')
    // Change first input
    await inputs[0].setValue('0.2')
    await flushPromises()
    // Change second input
    await inputs[1].setValue('0.6')
    await flushPromises()
    const emitted = wrapper.emitted('update:datas')
    expect(emitted).toBeTruthy()
    const firstEventData = emitted![0][0] as { key: string; value: string }[]
    const secondEventData = emitted![1][0] as { key: string; value: string }[]
    expect(firstEventData[0].value).toBe('0.2')
    expect(secondEventData[1].value).toBe('0.6')
  })

  it('shows error toast and does not call setCostPerImpression if costPerImpression is zero or negative', async () => {
    const { addErrorToast } = useToastStore()
    const datas = getClonedTestData()
    datas[1].value = '1' // costPerImpression = 0
    const wrapper = mount(TeamContractsDetail, {
      props: {
        datas: [],
        contractAddress,
        reset: true
      }
    })
    await flushPromises()
    await wrapper.setProps({ datas })
    const inputCostPerImpression = wrapper.findAll('input')[1]
    await inputCostPerImpression.setValue('0')
    await flushPromises()
    wrapper.vm.initialized = true
    await wrapper.find('button').trigger('click')
    await flushPromises()
    expect(setCostPerImpressionMock).not.toHaveBeenCalled()
    expect(addErrorToast).toHaveBeenCalledWith('Cost per impression should be greater than 0')
  })

  it('shows error toast if setCostPerClick returns failure status', async () => {
    setCostPerClickMock.mockResolvedValueOnce({ status: 0 }) // simulate failure
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
})
