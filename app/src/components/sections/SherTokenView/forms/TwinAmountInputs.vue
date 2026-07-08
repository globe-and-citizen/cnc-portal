<template>
  <div class="flex flex-col gap-2">
    <div class="flex items-center gap-2 md:gap-3">
      <div class="flex flex-1 items-center justify-between">
        <span class="text-xs text-gray-500" data-test="percentage-min"
          >Min &gt; {{ formatAmountWithPrecision(props.minPercentage, 0, 2) }}%</span
        >
        <span class="text-xs text-gray-500" data-test="percentage-max"
          >Max &lt; {{ formatAmountWithPrecision(props.maxPercentage, 0, 2) }}%</span
        >
      </div>
      <div class="size-5 shrink-0" />
      <div class="flex flex-1 items-center justify-end">
        <span class="text-xs text-gray-500">Both fields stay in sync.</span>
      </div>
    </div>

    <div class="flex items-center gap-2 md:gap-3">
      <UInput
        ref="percentageInput"
        class="flex-1"
        data-test="percentage-input"
        :color="inputColor"
        :modelValue="
          (hasTotalSupply && totalSupplyBigInt === 0n) || props.disablePercentage ? 100 : percentage
        "
        placeholder="0"
        :disabled="(hasTotalSupply && totalSupplyBigInt === 0n) || props.disablePercentage"
        @update:modelValue="handlePercentageUpdate"
      >
        <template #trailing>
          <span class="text-xs text-gray-500">%</span>
        </template>
      </UInput>

      <UIcon name="i-lucide-equal" class="size-5 shrink-0 text-gray-400" />

      <UInput
        ref="amountInput"
        class="flex-1"
        data-test="amount-input"
        :color="inputColor"
        :modelValue="amount"
        placeholder="0"
        @update:modelValue="handleAmountUpdate"
      >
        <template #trailing>
          <span class="text-xs text-gray-500">{{ tokenSymbol }}</span>
        </template>
      </UInput>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, useTemplateRef } from 'vue'
import { useInvestorSymbol, useInvestorTotalSupply } from '@/composables/investor/reads'
import { formatAmountWithPrecision } from '@/utils/currencyUtil'

const props = defineProps<{
  percentage: number
  amount: number
  minPercentage: number
  maxPercentage: number
  inputColor?: 'primary' | 'neutral'
  disablePercentage?: boolean
}>()

const emit = defineEmits<{
  'update:percentage': [value: number] // Emit number, not string
  'update:amount': [value: number] // Emit number, not string
}>()

const { data: tokenSymbol } = useInvestorSymbol()
const { data: totalSupplyRaw } = useInvestorTotalSupply()

const totalSupplyBigInt = computed<bigint>(() => (totalSupplyRaw.value as bigint | undefined) ?? 0n)
const hasTotalSupply = computed(() => totalSupplyRaw.value !== undefined)

const percentageInput = useTemplateRef<{ inputRef: HTMLInputElement | null }>('percentageInput')
const amountInput = useTemplateRef<{ inputRef: HTMLInputElement | null }>('amountInput')

const parseInput = (value: string | number) => {
  const parsed = Number(String(value).replace(/,/g, '').trim())
  if (!Number.isFinite(parsed)) return 0
  return parsed < 0 ? 0 : parsed
}

// When a typed value is clamped (e.g. a negative) the bound model may not change, so Vue
// won't repaint the field. Reflect the clamped value into the input element directly.
const reflectClamp = (
  input: { inputRef: HTMLInputElement | null } | null,
  raw: string | number,
  parsed: number
) => {
  if (String(raw) === String(parsed)) return
  nextTick(() => {
    if (input?.inputRef) input.inputRef.value = String(parsed)
  })
}

const handlePercentageUpdate = (value: string | number) => {
  const parsed = parseInput(value)
  emit('update:percentage', parsed)
  reflectClamp(percentageInput.value, value, parsed)
}

const handleAmountUpdate = (value: string | number) => {
  const parsed = parseInput(value)
  emit('update:amount', parsed)
  reflectClamp(amountInput.value, value, parsed)
}
</script>
