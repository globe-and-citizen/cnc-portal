<template>
  <div class="card w-1/3 shadow-xl" :class="cardClasses">
    <div class="card-body">
      <h2 class="card-title">{{ cardTitle }}</h2>
      <div class="font-extrabold text-neutral flex gap-2 items-baseline">
        <span class="inline-block h-10 text-4xl">
          <span class="loading loading-spinner loading-lg" v-if="isLoading"></span>
          <span v-else>{{ amount }} </span>
        </span>
        <span class="text-xs">{{ NETWORK.currencySymbol }}</span>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { NETWORK } from '@/constant'
import { computed } from 'vue'

const props = defineProps<{
  cardType: string
  amount?: number | undefined
  isLoading?: boolean | undefined
}>()

const cardClasses = computed(() => {
  return {
    'bg-base-200': props.cardType === 'balance',
    'bg-blue-100 text-blue-800': props.cardType === 'month-claims',
    'bg-orange-200 text-orange-800': props.cardType === 'approved-claims'
  }
})
const cardTitle = computed(() => {
  return {
    balance: 'Balance',
    'month-claims': 'Month Claims Withdrawed',
    'approved-claims': 'Approved Claims'
  }[props.cardType]
})
</script>
