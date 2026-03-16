<template>
  <label class="form-control w-full mt-6" data-test="compensation-amount">
    <div class="label">
      <slot name="label">
        <span class="label-text">{{ safeTokenSymbol }} to Receive</span>
        <span class="label-text-alt">
          Rate: 1 {{ depositTokenSymbol }} = {{ formattedRate }} {{ safeTokenSymbol }}
        </span>
      </slot>
    </div>
    <div class="w-full input input-bordered flex items-center">
      <input
        type="text"
        class="grow w-24"
        :value="displayValue"
        @input="handleInput"
        placeholder="0"
        :disabled="disabled"
        data-test="compensation-input"
        :aria-label="`${safeTokenSymbol} amount to receive`"
      />
      <div>
        <button
          class="flex items-center cursor-pointer badge badge-md badge-info text-xs cursor-default"
          disabled
          data-test="token-symbol-badge"
          :aria-label="`Token symbol: ${safeTokenSymbol}`"
        >
          {{ safeTokenSymbol.toUpperCase() }}
        </button>
      </div>
    </div>
  </label>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useInvestorSymbol } from '@/composables/investor/reads'
import { formatSherAmount } from '@/utils/safeDepositRouterUtil'

interface Props {
  modelValue: string
  depositTokenSymbol?: string
  rate: string | number
  disabled?: boolean
  showEstimate?: boolean
  decimals?: number
}

const props = withDefaults(defineProps<Props>(), {
  depositTokenSymbol: 'USDC',
  rate: '0',
  disabled: false,
  showEstimate: false,
  decimals: 6
})

const emits = defineEmits<{
  'update:modelValue': [value: string]
}>()

const { data: tokenSymbol } = useInvestorSymbol()
const safeTokenSymbol = computed(() =>
  typeof tokenSymbol.value === 'string' ? tokenSymbol.value : ''
)

// Format the rate for display using utility function
const formattedRate = computed(() => {
  if (!props.rate) return '0'
  const rateValue = typeof props.rate === 'string' ? props.rate : props.rate.toString()
  return formatSherAmount(rateValue, props.decimals)
})

// Format display value with proper decimal formatting
const displayValue = computed(() => {
  if (!props.modelValue || props.modelValue === '0') return props.modelValue
  return formatSherAmount(props.modelValue, props.decimals)
})

/**
 * Handle input changes - emit to parent for processing
 */
const handleInput = (event: Event) => {
  const input = event.target as HTMLInputElement
  const value = input.value

  // Allow empty input
  if (value === '') {
    emits('update:modelValue', '0')
    return
  }

  // Validate numeric input
  const numericValue = parseFloat(value)
  if (isNaN(numericValue) || numericValue < 0) {
    return
  }

  // Emit raw numeric string (without formatting)
  emits('update:modelValue', value)
}
</script>

<style scoped></style>
