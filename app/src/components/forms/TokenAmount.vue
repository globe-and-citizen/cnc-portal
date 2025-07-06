<template>
  {{ selectedToken }}
  <label class="form-control w-full" :class="{ 'mt-4': selectedToken?.id !== 'native' }">
    <div class="label">
      <span class="label-text">Deposit</span>
      <span class="label-text-alt">Balance: {{ selectedToken?.balance }}</span>
    </div>
    <div class="input input-bordered flex items-center">
      <input
        type="text"
        class="grow"
        placeholder="0"
        v-model="amount"
        data-test="amountInput"
        @input="handleAmountInput"
      />
      <div class="flex gap-1">
        <button
          v-for="percent in [25, 50, 75]"
          :key="percent"
          class="btn btn-xs btn-ghost cursor-pointer"
          @click="usePercentageOfBalance(percent)"
          :data-test="`percentButton-${percent}`"
        >
          {{ percent }}%
        </button>
      </div>
      <button
        class="btn btn-xs btn-ghost mr-2"
        @click="useMaxBalance"
        :disabled="isLoading"
        data-test="maxButton"
      >
        Max
      </button>
      <div>
        <SelectComponent
          :options="
            tokenList.map((token) => ({
              label: token.symbol,
              value: token.tokenId
            }))
          "
          :disabled="isLoading"
          @change="
            (value) => {
              handleTokenChange(value)
            }
          "
          :format-value="
            (value: string) => {
              return value === 'SepoliaETH' ? 'SepETH' : value
            }
          "
        />
      </div>
    </div>
    <div class="label">
      <!-- Estimated Price in selected currency -->
      <span class="label-text" v-if="amount && parseFloat(amount) > 0">
        ≈ {{ estimatedPrice }}
      </span>
      <div class="pl-4 text-red-500 text-sm" v-for="error in $v.amount.$errors" :key="error.$uid">
        {{ error.$message }}
      </div>
    </div>
  </label>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { required, numeric, helpers } from '@vuelidate/validators'
import { useVuelidate } from '@vuelidate/core'
import { formatCurrencyShort } from '@/utils/currencyUtil'
import SelectComponent from '@/components/SelectComponent.vue'

interface TokenOption {
  symbol: string
  tokenId: string
  name?: string
  balance: number
  price?: number
  code?: string
  [key: string]: unknown
}

const props = defineProps<{
  tokens: TokenOption[]
  modelValue: string
  modelToken: string
  isLoading?: boolean
}>()
const emits = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'update:modelToken', value: string): void
}>()

const amount = computed({
  get: () => props.modelValue,
  set: (val: string) => emits('update:modelValue', val)
})
const selectedTokenId = computed({
  get: () => props.modelToken,
  set: (val: string) => emits('update:modelToken', val)
})

const tokenList = computed(() => props.tokens)
const selectedToken = computed(() =>
  props.tokens.find((b) => b.tokenId === selectedTokenId.value)
)

const estimatedPrice = computed(() => {
  const price = selectedToken.value?.price ?? 0
  const code = selectedToken.value?.code ?? 'USD'
  const value = (Number(amount.value) || 0) * price
  return formatCurrencyShort(value, code)
})

const notZero = helpers.withMessage('Amount must be greater than 0', (value: string) => {
  return parseFloat(value) > 0
})
const notExceedingBalance = helpers.withMessage('Amount exceeds your balance', (value: string) => {
  if (!value || parseFloat(value) <= 0) return true
  const amountValue = selectedToken.value?.balance ?? 0
  return parseFloat(value) <= amountValue
})
const rules = {
  amount: {
    required,
    numeric,
    notZero,
    notExceedingBalance
  }
}
const $v = useVuelidate(rules, { amount })

const useMaxBalance = () => {
  amount.value = selectedToken.value?.balance?.toString() ?? '0.00'
}
const usePercentageOfBalance = (percentage: number) => {
  amount.value = (((selectedToken.value?.balance ?? 0) * percentage) / 100).toFixed(4)
}
const handleAmountInput = (event: Event) => {
  const input = event.target as HTMLInputElement
  const value = input.value.replace(/[^\d.]/g, '')
  const parts = value.split('.')
  if (parts.length > 2) {
    amount.value = parts[0] + '.' + parts.slice(1).join('')
  } else {
    amount.value = value
  }
}
const handleTokenChange = (value: string) => {
  selectedTokenId.value = value
}
watch(amount, () => {
  $v.value.$touch()
})
</script>

<style scoped></style>
