<template>
  <div class="card w-1/3 shadow-xl" data-test="card" :class="cardClasses">
    <div class="card-body">
      <h2 class="card-title">{{ cardTitle }}</h2>
      <div class="font-extrabold text-neutral flex gap-2 items-baseline">
        <span class="inline-block h-10 text-4xl">
          <span
            class="loading loading-spinner loading-lg"
            v-if="isLoading"
            data-test="loading-spinner"
          ></span>
          <span v-else data-test="amount"
            >{{ props.cardType == 'balance' ? formatEther(balance?.value!) : amount }}
          </span>
        </span>
        <span class="text-xs">{{ NETWORK.currencySymbol }}</span>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { NETWORK } from '@/constant'
import { useToastStore } from '@/stores'
import { useBalance } from '@wagmi/vue'
import { formatEther, type Address } from 'viem'
import { computed, watch } from 'vue'

const toastStore = useToastStore()
const props = defineProps<{
  cardType: string
  amount?: number | undefined
  cashRemunerationEip712Address: string
}>()

const {
  data: balance,
  isLoading: balanceLoading,
  error: balanceError
} = useBalance({
  address: props.cashRemunerationEip712Address as Address,
  query: {
    enabled: props.cardType === 'balance'
  }
})

const isLoading = computed(() => {
  return props.cardType === 'balance' ? balanceLoading.value : false
})

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

watch(balanceError, (val) => {
  if (val) {
    console.error(val)
    toastStore.addErrorToast('Error fetching balance')
    
  }
})
</script>
