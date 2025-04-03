import { describe, it, expect, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import TokenHoldingSection from '@/components/GenericTokenHoldingsSection.vue'
import TableComponent from '@/components/TableComponent.vue'
import { ref } from 'vue'
import CardComponent from '@/components/CardComponent.vue'
import * as utils from '@/utils'
import { parseEther } from 'viem'

const mockUseCryptoPrice = {
  price: ref(1),
  loading: ref(false),
  error: ref<Error | null>(null)
}

const mockUseCurrencyStore = {
  currency: {
    code: `USD`,
    symbol: `$`
  },
  nativeTokenPrice: 2500,
  nativeTokenPriceInUSD: 2500
}

vi.mock('@/stores/currencyStore', async (importOriginal) => {
  const original: object = await importOriginal()
  return {
    ...original,
    useCurrencyStore: vi.fn(() => ({ ...mockUseCurrencyStore }))
  }
})

vi.mock('@/composables/useCryptoPrice', async (importOriginal) => {
  const original: object = await importOriginal()
  return {
    ...original,
    useCryptoPrice: vi.fn(() => ({ ...mockUseCryptoPrice }))
  }
})

const mockUseBalance = {
  data: ref({
    decimals: 18,
    formatted: `100`,
    symbol: `SepoliaETH`,
    value: parseEther(`100`)
  }),
  refetch: vi.fn(),
  error: ref<Error | null>(null),
  isLoading: ref(false)
}

const mockUseReadContract = {
  data: ref(BigInt(20000 * 1e6)),
  refetch: vi.fn(),
  error: ref<Error | null>(null),
  isLoading: ref(false)
}

vi.mock('@wagmi/vue', async (importOriginal) => {
  const original: object = await importOriginal()
  return {
    ...original,
    useBalance: vi.fn(() => ({ ...mockUseBalance })),
    useReadContract: vi.fn(() => ({ ...mockUseReadContract })),
    useChainId: vi.fn(() => ref(1))
  }
})

describe('TransactionHistorySection', () => {
  const defaultProps = {
    // networkCurrencyBalance: `100`,
    // usdcBalance: `20000`
    address: `0xContractAddress`
  }

  const createComponent = mount(TokenHoldingSection, { props: defaultProps })

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
    expect(firstRow.html()).toContain(`$2,500.00`)
    expect(firstRow.html()).toContain(`$250,000.00`)
    const secondRow = tableComponent.find('[data-test="1-row"]')
    expect(secondRow.exists()).toBeTruthy()
    expect(secondRow.html()).toContain(`20,000.00`)
    expect(secondRow.html()).toContain(`1.00`)
    expect(secondRow.html()).toContain(`$20,000.00`)
  })

  it('should log network currency balance error', async () => {
    mockUseBalance.error.value = new Error('Error getting network currency balance')
    const logErrorSpy = vi.spyOn(utils.log, 'error')
    mount(TokenHoldingSection, { props: defaultProps })

    await flushPromises()

    expect(logErrorSpy).toBeCalledWith(
      'networkCurrencyBalanceError.value',
      'Error getting network currency balance'
    )
  })

  it('should log network usdc balance error', async () => {
    mockUseReadContract.error.value = new Error('Error getting USDC balance')
    const logErrorSpy = vi.spyOn(utils.log, 'error')
    mount(TokenHoldingSection, { props: defaultProps })

    await flushPromises()

    expect(logErrorSpy).toBeCalledWith('usdcBalanceError.value', 'Error getting USDC balance')
  })
})
