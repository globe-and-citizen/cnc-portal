import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import TransferForm from '../TransferForm.vue'
import TokenAmount from '../TokenAmount.vue'
import SelectMemberContractsInput from '@/components/ui/inputs/SelectMemberContractsInput.vue'
import { NETWORK, type TokenId } from '@/constant'
import type { TokenOption } from '@/types'

const defaultTokens: TokenOption[] = [
  {
    symbol: NETWORK.currencySymbol,
    balance: 100,
    tokenId: 'native' as TokenId,
    price: 2000,
    code: 'USD'
  },
  { symbol: 'USDC', balance: 50, tokenId: 'usdc' as TokenId, price: 1, code: 'USD' }
]

const defaultModelValue = {
  address: { name: '', address: '' },
  token: {
    symbol: NETWORK.currencySymbol,
    balance: 100,
    tokenId: 'native' as TokenId,
    price: 2000,
    code: 'USD'
  },
  amount: '0'
}

const defaultProps = {
  loading: false,
  tokens: defaultTokens,
  modelValue: defaultModelValue
}

type TransferFormProps = Partial<typeof defaultProps> & Record<string, unknown>
function createModelValue(overrides: Partial<typeof defaultModelValue> = {}) {
  return {
    ...defaultModelValue,
    ...overrides,
    address: {
      ...defaultModelValue.address,
      ...overrides.address
    },
    token: {
      ...defaultModelValue.token,
      ...overrides.token
    }
  }
}

function factory(props: TransferFormProps = {}) {
  const { modelValue, ...rest } = props

  return mount(TransferForm, {
    props: {
      ...defaultProps,
      ...rest,
      modelValue: createModelValue((modelValue as Partial<typeof defaultModelValue>) ?? {})
    },
    global: {
      plugins: [createTestingPinia({ createSpy: vi.fn })]
    }
  })
}

async function emitTokenAmount(
  wrapper: ReturnType<typeof factory>,
  value: { amount?: string; tokenId?: TokenId }
) {
  await wrapper.findComponent(TokenAmount).vm.$emit('update:modelValue', value)
  await wrapper.vm.$nextTick()
}

describe('TransferForm.vue', () => {
  let wrapper: ReturnType<typeof factory>

  beforeEach(() => {
    wrapper = factory()
  })

  describe('Actions', () => {
    it('renders the Board approval notice when the form is used in bod mode', () => {
      const w = factory({ isBodAction: true })

      expect(w.find('[data-test="bod-action-alert"]').exists()).toBe(true)
      expect(w.text()).toContain('This will create a BOD action')
    })

    it('emits closeModal event when Cancel button is clicked', async () => {
      await wrapper.find('[data-test="cancel-button"]').trigger('click')

      expect(wrapper.emitted('closeModal')).toBeTruthy()
    })

    it('renders the inline error alert when errorMessage prop is provided', () => {
      expect(wrapper.find('[data-test="error-alert"]').exists()).toBe(false)

      const withError = factory({ errorMessage: 'Transfer failed' })
      expect(withError.find('[data-test="error-alert"]').exists()).toBe(true)
      expect(withError.find('[data-test="error-alert"]').text()).toContain('Transfer failed')
    })

    it('emits transfer event when the form is submitted', async () => {
      await wrapper.setProps({ modelValue: createModelValue({ amount: '10' }) })
      await wrapper.find('form').trigger('submit')
      await flushPromises()

      expect(wrapper.emitted('transfer')).toBeTruthy()
      expect(wrapper.emitted('transfer')?.[0]?.[0]).toMatchObject({
        amount: '10',
        token: expect.objectContaining({ tokenId: 'native' })
      })
    })
  })

  describe('SelectMember interaction', () => {
    it('updates model.address when selectItem is emitted', async () => {
      const item = {
        name: 'Alice',
        address: '0xAbCd1234567890AbCd1234567890AbCd12345678',
        type: 'member' as const
      }

      await wrapper.findComponent(SelectMemberContractsInput).vm.$emit('selectItem', item)
      await wrapper.vm.$nextTick()

      expect(wrapper.props('modelValue').address).toEqual(item)
    })
  })

  describe('Tokens watch', () => {
    it('updates selected token when prop tokens change and current tokenId is not in new list', async () => {
      const newTokens: TokenOption[] = [
        { symbol: 'USDC', balance: 75, tokenId: 'usdc' as TokenId, price: 1, code: 'USD' }
      ]

      await wrapper.setProps({ tokens: newTokens })
      await wrapper.vm.$nextTick()

      expect(wrapper.props('modelValue').token.tokenId).toBe('usdc')
    })

    it('does not change token when current tokenId is still in the updated tokens list', async () => {
      const updatedTokens: TokenOption[] = [
        {
          symbol: NETWORK.currencySymbol,
          balance: 200,
          tokenId: 'native' as TokenId,
          price: 3000,
          code: 'USD'
        }
      ]

      await wrapper.setProps({ tokens: updatedTokens })
      await wrapper.vm.$nextTick()

      expect(wrapper.props('modelValue').token.tokenId).toBe('native')
    })

    it('does nothing when tokens becomes empty', async () => {
      await wrapper.setProps({ tokens: [] })
      await wrapper.vm.$nextTick()

      expect(wrapper.props('modelValue').token.tokenId).toBe('native')
    })
  })

  describe('Form validation', () => {
    it.each(['', 'abc', '0', '150'])('does not submit an invalid amount of %s', async (amount) => {
      const w = factory({ modelValue: createModelValue({ amount }) })
      await w.find('form').trigger('submit')

      expect(w.emitted('transfer')).toBeFalsy()
    })

    it('does not submit an amount when the fee-adjusted total exceeds the balance', async () => {
      const w = factory({ feeBps: 1000, modelValue: createModelValue({ amount: '91' }) })

      await w.find('form').trigger('submit')

      expect(w.emitted('transfer')).toBeFalsy()
    })
  })

  describe('onMounted', () => {
    it('sets model.token to the first token on mount when tokens are provided', () => {
      expect(wrapper.props('modelValue').token.tokenId).toBe('native')
    })

    it('does not change token when mounted with empty tokens list', () => {
      const w = factory({ tokens: [], modelValue: createModelValue() })

      expect(w.props('modelValue').token).toBeDefined()
    })
  })

  describe('Fee computation', () => {
    it('computes zero fee when feeBps is 0', async () => {
      const w = factory({ modelValue: createModelValue({ amount: '10' }) })
      await w.vm.$nextTick()

      expect(w.find('.bg-green-50').exists()).toBe(false)
      expect(w.find('[data-test="transferButton"]').text()).toBe('Transfer')
    })

    it('computes correct fee for feeBps > 0 (recipient gets exactly the specified amount)', async () => {
      const w = factory({
        feeBps: 500,
        modelValue: createModelValue({ amount: '100' })
      })
      await w.vm.$nextTick()

      const breakdown = w.find('.bg-green-50')
      expect(breakdown.exists()).toBe(true)
      expect(breakdown.text()).toContain('5.26')
    })
  })

  describe('Null-safety fallback branches', () => {
    it('passes the fallback token id to TokenAmount when the model token id is missing', () => {
      const w = factory({
        tokens: [],
        modelValue: createModelValue({
          token: {
            symbol: 'X',
            balance: 0,
            tokenId: undefined as unknown as TokenId,
            price: 0,
            code: 'USD'
          } as unknown as typeof defaultModelValue.token
        })
      })

      expect(w.findComponent(TokenAmount).props('modelValue')).toMatchObject({ tokenId: 'usdc' })
    })

    it('passes an empty amount to TokenAmount when the model amount is undefined', () => {
      const w = factory({
        modelValue: createModelValue({ amount: undefined as unknown as string })
      })

      expect(w.findComponent(TokenAmount).props('modelValue')).toMatchObject({ amount: '' })
    })

    it('tokenAmountModel setter handles undefined amount', async () => {
      await emitTokenAmount(wrapper, {
        amount: undefined,
        tokenId: 'native' as TokenId
      })

      expect(wrapper.props('modelValue').amount).toBe('')
    })

    it('tokenAmountModel setter handles undefined tokenId', async () => {
      await emitTokenAmount(wrapper, { amount: '5', tokenId: undefined })

      expect(wrapper.props('modelValue').token.tokenId).toBe('native')
    })

    it('selectedTokenId setter does nothing when token is not found in list', async () => {
      await emitTokenAmount(wrapper, {
        amount: '5',
        tokenId: 'unknown-token' as TokenId
      })

      expect(wrapper.props('modelValue').token.tokenId).toBe('native')
    })

    it('SelectMemberContractsInput v-model setter updates model.address', async () => {
      const newAddress = { name: 'Bob', address: '0xBob0000000000000000000000000000000000000' }

      await wrapper
        .findComponent(SelectMemberContractsInput)
        .vm.$emit('update:modelValue', newAddress)
      await wrapper.vm.$nextTick()

      expect(wrapper.props('modelValue').address).toEqual(newAddress)
    })

    it('does not display a fee breakdown when feeBps is null', () => {
      const w = factory({
        feeBps: null as unknown as number,
        modelValue: createModelValue({ amount: '10' })
      })

      expect(w.find('.bg-green-50').exists()).toBe(false)
    })
  })
})
