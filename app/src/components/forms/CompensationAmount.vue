<template>
  <label class="form-control mt-6 w-full" data-test="compensation-amount">
    <div class="label">
      <slot name="label">
        <span class="label-text">{{ safeTokenSymbol }} to Receive</span>
        <span class="label-text-alt">
          Rate: 1 {{ depositTokenSymbol }} = {{ formattedRate }} {{ safeTokenSymbol }}
        </span>
      </slot>
    </div>
    <UInput
      :model-value="displayValue"
      placeholder="0"
      :disabled="disabled"
      data-test="compensation-input"
      :aria-label="`${safeTokenSymbol} amount to receive`"
      class="w-full"
      :ui="{ trailing: 'pr-1' }"
      @update:model-value="handleInput"
    >
      <template #trailing>
        <UBadge
          color="info"
          variant="subtle"
          size="sm"
          data-test="token-symbol-badge"
          :aria-label="`Token symbol: ${safeTokenSymbol}`"
        >
          {{ safeTokenSymbol.toUpperCase() }}
        </UBadge>
      </template>
    </UInput>
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

const formattedRate = computed(() => {
  if (!props.rate) return '0'
  const rateValue = typeof props.rate === 'string' ? props.rate : props.rate.toString()
  return formatSherAmount(rateValue, props.decimals)
})

const displayValue = computed(() => {
  if (!props.modelValue || props.modelValue === '0') return props.modelValue
  return formatSherAmount(props.modelValue, props.decimals)
})

const handleInput = (value: string | number) => {
  const stringValue = typeof value === 'number' ? String(value) : value

  if (stringValue === '') {
    emits('update:modelValue', '0')
    return
  }

  const numericValue = parseFloat(stringValue)
  if (isNaN(numericValue) || numericValue < 0) {
    return
  }

  emits('update:modelValue', stringValue)
}
</script>
