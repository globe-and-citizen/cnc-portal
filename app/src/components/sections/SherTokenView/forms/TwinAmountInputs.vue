<template>
  <div class="flex flex-col gap-2">
    <div class="flex items-center justify-end">
      <span class="text-xs text-gray-500">Both fields stay in sync.</span>
    </div>

    <div class="flex items-center gap-2 md:gap-3">
      <UInput
        class="flex-1"
        data-test="percentage-input"
        :color="inputColor"
        :modelValue="isPercentageModeDisabled ? '100' : percentage"
        placeholder="0"
        :disabled="isPercentageModeDisabled"
        @update:modelValue="emit('update:percentage', $event)"
      >
        <template #trailing>
          <span class="text-sm font-semibold text-gray-500 select-none">%</span>
        </template>
      </UInput>

      <UIcon name="i-lucide-equal" class="size-5 shrink-0 text-gray-400" />

      <UInput
        class="flex-1"
        data-test="amount-input"
        :color="inputColor"
        :modelValue="amount"
        placeholder="0"
        @update:modelValue="emit('update:amount', $event)"
      >
        <template #trailing>
          <span class="text-sm font-semibold text-gray-500 select-none">{{ tokenSymbol }}</span>
        </template>
      </UInput>
    </div>

    <p v-if="totalSupplyDisplay !== null" class="text-xs text-gray-500">
      Total supply:
      <span class="font-semibold">{{ totalSupplyDisplay }} {{ tokenSymbol }}</span>
      <span v-if="isPercentageModeDisabled" class="ml-1 text-amber-500"
        >— issue a fixed amount first to enable percentage mode</span
      >
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { formatUnits } from 'viem'
import { useInvestorSymbol, useInvestorTotalSupply } from '@/composables/investor/reads'
import { TOKEN_DECIMALS } from '@/utils/investorMintAllocation'

defineProps<{
  percentage: string
  amount: string
  inputColor?: 'primary' | 'neutral'
}>()

const emit = defineEmits<{
  'update:percentage': [value: string | number]
  'update:amount': [value: string | number]
}>()

const { data: tokenSymbol } = useInvestorSymbol()
const { data: totalSupplyRaw } = useInvestorTotalSupply()

const isPercentageModeDisabled = computed(
  () => typeof totalSupplyRaw.value === 'bigint' && totalSupplyRaw.value === 0n
)

const totalSupplyDisplay = computed(() => {
  if (typeof totalSupplyRaw.value !== 'bigint') return null
  return formatUnits(totalSupplyRaw.value, TOKEN_DECIMALS)
})
</script>
