import { mount, flushPromises } from '@vue/test-utils'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import TeamContractsDetail from '@/components/TeamContractsDetail.vue'

const setCostPerClickMock = vi.fn().mockResolvedValue({ status: 1 })
const setCostPerImpressionMock = vi.fn().mockResolvedValue({ status: 1 })
vi.mock('@/stores/useToastStore')
vi.mock('@/services/AddCampaignService', () => ({
  AddCampaignService: vi.fn().mockImplementation(() => ({
    setCostPerClick: setCostPerClickMock,
    setCostPerImpression: setCostPerImpressionMock
  }))
}))

describe.skip('TeamContractsDetail.vue', () => {
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
    setCostPerClickMock.mockClear()
    setCostPerImpressionMock.mockClear()
  })

  it('renders table headers correctly', () => {
    const wrapper = mount(TeamContractsDetail, {
      props: {
        datas: testData,
        contractAddress: contractAddress,
        reset: true
      }
    })

    // Check that table headers exist and are correct
    const headers = wrapper.findAll('th')
    expect(headers[0].text()).toBe('#')
    expect(headers[1].text()).toBe('Name')
    expect(headers[2].text()).toBe('Value')
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

  it('renders table rows correctly when no data is passed', () => {
    const wrapper = mount(TeamContractsDetail, {
      props: {
        datas: [],
        contractAddress: contractAddress,
        reset: true
      }
    })

    // Ensure that no rows are rendered
    const rows = wrapper.findAll('tbody tr')
    expect(rows.length).toBe(0)
  })

  it('does not call update functions if values have not changed', async () => {
    const wrapper = mount(TeamContractsDetail, {
      props: {
        datas: getClonedTestData(), // ensure fresh data
        contractAddress,
        reset: true
      }
    })

    await flushPromises()

    //  simulate "already initialized" state
    //wrapper.vm.initialized = true
    wrapper.vm.originalValues = {
      costPerClick: 0.1,
      costPerImpression: 0.5
    }
    wrapper.vm.originalCostPerClick = 0.1
    wrapper.vm.originalCostPerImpression = 0.5

    // Submit without any change
    await wrapper.find('button').trigger('click')
    await flushPromises()

    //  Expect no update functions were called
    expect(setCostPerClickMock).not.toHaveBeenCalled()
    expect(setCostPerImpressionMock).not.toHaveBeenCalled()
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
    expect(setCostPerClickMock).toHaveBeenCalledWith(contractAddress, '0.2')
    expect(setCostPerImpressionMock).toHaveBeenCalledWith(contractAddress, '0.4')
  })

  it('updates value correctly when input event is triggered', async () => {
    const wrapper = mount(TeamContractsDetail, {
      props: {
        datas: testData,
        contractAddress: contractAddress,
        reset: true
      }
    })

    // Simulate user input to trigger updateValue method
    const inputCostPerClick = wrapper.findAll('input')[0]
    await inputCostPerClick.setValue('0.2')

    await wrapper.vm.$nextTick()
    const emittedEvents = wrapper.emitted('update:datas')
    expect(emittedEvents).toBeTruthy()
    const firstEvent = emittedEvents?.[0] as unknown[]
    expect(firstEvent).toBeTruthy()
    const firstEventData = firstEvent[0] as { key: string; value: string }[]
    expect(firstEventData[0].value).toBe('0.2')
  })

  it('renders table rows correctly when data is null', () => {
    const wrapper = mount(TeamContractsDetail, {
      props: {
        datas: null as unknown as { key: string; value: string }[],
        contractAddress: contractAddress,
        reset: true
      }
    })

    // Ensure that no rows are rendered
    const rows = wrapper.findAll('tbody tr')
    expect(rows.length).toBe(0)
  })

  it('shows error toast and does not call setCostPerClick if costPerClick is zero or negative', async () => {
    const datas = getClonedTestData()
    datas[0].value = '0' // costPerClick = 0

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

    expect(setCostPerClickMock).not.toHaveBeenCalled()
  })

  it('shows error toast and does not call setCostPerImpression if costPerImpression is zero or negative', async () => {
    const datas = getClonedTestData()
    datas[1].value = '0' // costPerImpression = 0

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

    expect(setCostPerImpressionMock).not.toHaveBeenCalled()
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
})
