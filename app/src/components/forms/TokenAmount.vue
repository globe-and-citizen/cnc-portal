<template>
  <label class="form-control w-full mt-4">
    <div class="label">
      <slot name="label">
        <span class="label-text">Action</span>
        <span class="label-text-alt">Balance: {{ selectedToken?.balance }}</span>
      </slot>
    </div>
    <div class="w-full input input-bordered flex items-center">
      <input
        type="text"
        class="grow w-24"
        placeholder="0"
        v-model="amount"
        data-test="amountInput"
        @input="handleAmountInput"
        aria-label="Deposit amount"
        :disabled="isLoading"
      />
      <div class="flex">
        <button
          v-for="percent in [25, 50, 75]"
          :key="percent"
          class="btn btn-xs btn-ghost cursor-pointer"
          @click="usePercentageOfBalance(percent)"
          :data-test="`percentButton-${percent}`"
          :disabled="isLoading || !selectedToken || selectedToken.balance === 0"
          :aria-label="`Set ${percent}% of balance`"
        >
          {{ percent }}%
        </button>
      </div>
      <button
        class="btn btn-xs btn-ghost mr-2"
        @click="useMaxBalance"
        :disabled="isLoading || !selectedToken || selectedToken.balance === 0"
        data-test="maxButton"
        aria-label="Set max balance"
      >
        Max
      </button>
      <div>
        <SelectComponent
          v-model="selectedTokenId"
          :options="tokenList.map((token) => ({ label: token.symbol, value: token.tokenId }))"
          :disabled="isLoading || tokenList.length === 1"
          :format-value="(value: string) => (value === 'SepoliaETH' ? 'SepETH' : value)"
          aria-label="Select token"
        />
      </div>
    </div>
    <div class="label">
      <span class="label-text" v-if="amount && parseFloat(amount) > 0">
        ≈ {{ estimatedPrice }}
      </span>
      <div
        class="pl-4 text-red-500 text-sm"
        v-for="(error, index) in validationErrors"
        :key="index"
      >
        {{ error }}
      </div>
    </div>
  </label>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { z } from 'zod'
import { formatCurrencyShort } from '@/utils/currencyUtil'
import SelectComponent from '@/components/SelectComponent.vue'
import { useStorage } from '@vueuse/core'
import type { TokenOption } from '@/types'

const props = defineProps<{
  tokens: TokenOption[]
  modelValue: string
  modelToken: string
  isLoading?: boolean
}>()
const emits = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'update:modelToken', value: string): void
  (e: 'validation', isValid: boolean): void
}>()
const currency = useStorage('currency', {
  code: 'USD',
  name: 'US Dollar',
  symbol: '$'
})
const amount = computed({
  get: () => props.modelValue,
  set: (val: string) => emits('update:modelValue', val)
})
const selectedTokenId = computed({
  get: () => props.modelToken,
  set: (val: string) => emits('update:modelToken', val)
})

const tokenList = computed(() => props.tokens)
const selectedToken = computed(() => props.tokens.find((b) => b.tokenId === selectedTokenId.value))

const availableBalance = computed(() => {
  const token = selectedToken.value
  if (!token) return 0
  return token.spendableBalance ?? token.balance ?? 0
})

const estimatedPrice = computed(() => {
  const price = selectedToken.value?.price ?? 0
  const code = currency.value?.code ?? 'USD'
  const value = (Number(amount.value) || 0) * price
  return formatCurrencyShort(value, code)
})

const touched = ref(false)

const amountSchema = computed(() =>
  z
    .string()
    .min(1, 'Value is required')
    .refine((val) => !isNaN(Number(val)) && val.trim() !== '', {
      message: 'Value is not a valid number'
    })
    .refine((val) => parseFloat(val) > 0, {
      message: 'Amount must be greater than 0'
    })
    .refine(
      (val) => {
        if (!val || parseFloat(val) <= 0) return true
        return parseFloat(val) <= availableBalance.value
      },
      { message: 'Amount exceeds your balance' }
    )
)

const parseResult = computed(() => {
  const result = amountSchema.value.safeParse(amount.value)
  return {
    success: result.success,
    errors: result.success ? [] : result.error.issues.map((e) => e.message)
  }
})

const validationErrors = computed(() => {
  if (!touched.value) return []
  return parseResult.value.errors
})

// Emit validation state to parent
watch(
  () => parseResult.value.success,
  (success) => {
    emits('validation', success)
  },
  { immediate: true }
)

const useMaxBalance = () => {
  amount.value = availableBalance.value.toString() ?? '0.00'
  touched.value = true
}
const usePercentageOfBalance = (percentage: number) => {
  amount.value = (((availableBalance.value ?? 0) * percentage) / 100).toFixed(4)
  touched.value = true
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
  touched.value = true
}
watch(amount, () => {
  touched.value = true
})
</script>

<style scoped></style>
