<template>
  <div class="space-y-2">
    <div
      v-for="rate in rates"
      :key="rate.type"
      class="flex items-center gap-1 font-semibold"
      :class="textClass"
      :data-rate-type="rate.type"
      data-test="rate-row"
    >
      <span
        class="inline-block h-2 w-2 shrink-0 rounded-full"
        :class="{
          'bg-yellow-400': rate.type === 'native',
          'bg-blue-500': rate.type === 'usdc',
          'bg-green-500': rate.type === 'usdt',
          'bg-purple-500': !['native', 'usdc', 'usdt'].includes(rate.type)
        }"
      />
      {{ rateSymbol(rate.type) }}
      {{ formatRateAmount(rate.amount) }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { rateSymbol } from '@/utils/wageUtil'
import { formatNumber } from '@/utils/format'

interface RateItem {
  type: string
  amount: number
}

const props = withDefaults(
  defineProps<{
    rates: RateItem[]
    textClass?: string
    minimumFractionDigits?: number
    maximumFractionDigits?: number
  }>(),
  {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }
)

const formatRateAmount = (amount: number) => {
  return formatNumber(amount, {
    minDecimals: props.minimumFractionDigits,
    maxDecimals: props.maximumFractionDigits
  })
}
</script>
