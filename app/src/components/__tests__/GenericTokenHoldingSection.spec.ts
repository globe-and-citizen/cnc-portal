import { describe, it, expect, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import TokenHoldingSection from '@/components/GenericTokenHoldingsSection.vue'
import TableComponent from '@/components/TableComponent.vue'
import { ref } from 'vue'
import CardComponent from '@/components/CardComponent.vue'
import * as utils from '@/utils'

const mockUseCryptoPrice = {
  prices: ref({'ethereum': {usd: 2500}, 'usd-coin': {usd: 1}}),
  loading: ref(false),
  error: ref<Error | null>(null)
}

vi.mock('@/composables/useCryptoPrice', async (importOriginal) => {
  const original: object = await importOriginal()
  return {
    ...original,
    useCryptoPrice: vi.fn(() => ({...mockUseCryptoPrice}))
  }
})

describe('TransactionHistorySection', () => {
  const defaultProps = {
    networkCurrencyBalance: `100`,
    usdcBalance: `20000`
  }

  const createComponent = mount(TokenHoldingSection, {props:defaultProps})

  it('renders correctly', async () => {
    const wrapper = createComponent
    await flushPromises()
    expect(wrapper.exists()).toBe(true)
    const cardComponet = wrapper.findComponent(CardComponent)
    expect(cardComponet.exists()).toBeTruthy()
    const tableComponent = wrapper.findComponent(TableComponent)
    expect(tableComponent.exists()).toBeTruthy()
    const firstRow = tableComponent.find('[data-test="0-row"]')
    expect(firstRow.exists()).toBeTruthy()
    expect(firstRow.html()).toContain(`100`)
    expect(firstRow.html()).toContain(`$2500`)
    expect(firstRow.html()).toContain(`$250000.00`)
    const secondRow = tableComponent.find('[data-test="1-row"]')
    expect(secondRow.exists()).toBeTruthy()
    expect(secondRow.html()).toContain(`20000.00`)
    expect(secondRow.html()).toContain(`$1.00`)
    expect(secondRow.html()).toContain(`$20000.00`)
  })

  it('should log error', async () => {
    mockUseCryptoPrice.error.value = new Error('Error getting price')
    const logErrorSpy = vi.spyOn(utils.log, 'error')
    mount(TokenHoldingSection, {props:defaultProps})

    await flushPromises()

    expect(logErrorSpy).toBeCalledWith('priceError.value', 'Error getting price')
  })
})
