import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import TransferForm from '../TransferForm.vue'
import TokenAmount from '../TokenAmount.vue'
import SelectMemberContractsInput from '@/components/utils/SelectMemberContractsInput.vue'
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
type ValidationResult =
  | { success: true }
  | { success: false; error: { issues: Array<{ message: string }> } }

type TransferFormVm = {
  validationSchema: { safeParse: (value: { amount: string }) => ValidationResult }
  depositFee: number
  showFees: boolean
  selectedTokenId: string
  tokenAmountModel: { amount: string; tokenId: string }
}

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

function getVm(wrapper: ReturnType<typeof factory>) {
  return wrapper.vm as unknown as TransferFormVm
}

function validateAmount(wrapper: ReturnType<typeof factory>, amount: string) {
  return getVm(wrapper).validationSchema.safeParse({ amount })
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
    it('renders BodAlert when the form is used in bod mode', () => {
      const w = factory({ isBodAction: true })

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

  describe('Validation schema', () => {
    it('passes validation for a valid amount within balance (no fee)', () => {
      expect(validateAmount(wrapper, '50').success).toBe(true)
    })

    it.each([
      ['', 'Amount is required'],
      ['abc', 'Enter a valid amount'],
      ['0', 'Amount must be greater than 0'],
      ['150', 'Amount + fees exceed available balance']
    ])('fails validation for amount %s', (amount, message) => {
      const result = validateAmount(wrapper, amount)

      expect(result.success).toBe(false)
      expect(result.error.issues[0].message).toBe(message)
    })

    it('includes fee in balance check when feeBps > 0', () => {
      const w = factory({
        feeBps: 1000,
        modelValue: createModelValue({ amount: '10' })
      })

      expect(validateAmount(w, '90').success).toBe(true)

      const invalid = validateAmount(w, '91')
      expect(invalid.success).toBe(false)
      expect(invalid.error.issues[0].message).toBe('Amount + fees exceed available balance')
    })

    it('keeps validation valid when the fee-adjusted total exactly matches the balance', () => {
      const w = factory({
        feeBps: 1000,
        modelValue: createModelValue({ amount: '10' })
      })

      expect(validateAmount(w, '90').success).toBe(true)
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
      expect(getVm(w).showFees).toBe(false)
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

    it('depositFee returns 0 when feeBps is 0', () => {
      expect(getVm(wrapper).depositFee).toBe(0)
    })
  })

  describe('Null-safety fallback branches', () => {
    it('selectedTokenId getter falls back to "usdc" when token has no tokenId', () => {
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

      expect(getVm(w).selectedTokenId).toBe('usdc')
    })

    it('tokenAmountModel getter falls back to empty string when amount is undefined', () => {
      const w = factory({
        modelValue: createModelValue({ amount: undefined as unknown as string })
      })

      expect(getVm(w).tokenAmountModel.amount).toBe('')
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

    it('depositFee uses 0 fallback for feeBps ?? 0 when feeBps is null', () => {
      expect(getVm(factory({ feeBps: null as unknown as number })).depositFee).toBe(0)
    })

    it('validation refine uses 0 fallback for feeBps ?? 0 when feeBps is null', () => {
      expect(validateAmount(factory({ feeBps: null as unknown as number }), '10').success).toBe(
        true
      )
    })
  })
})
