<template>
  <div class="w-full">
    <CardComponent :class="cardClasses" title="" class="w-80 h-56">
      <div class="flex flex-col gap-1 items-center">
        <img :src="cardIcon" alt="icon" class="w-16 h-16" />
        <span
          class="text-4xl font-bold"
          v-if="!props.isLoading"
          :class="{ truncate: (cardAttributes?.currency ?? '').length > 4 }"
          >{{
            Intl.NumberFormat('en-US', {
              notation: 'compact',
              maximumFractionDigits: 1
            }).format(amount ?? 0)
          }}
          {{ cardAttributes?.currency }}</span
        >
        <SkeletonLoading class="w-20 h-11 opacity-30" v-if="props.isLoading" />
        <span class="text-sm font-semibold">{{ cardAttributes!.title }}</span>
        <div class="flex flex-row gap-1" v-if="!props.isLoading">
          <img :src="lastMonthStatusIcon" alt="status-icon" />
          <div>
            <span class="font-semibold text-sm"
              >{{ parseFloat(percentageIncrease.toString()) > 0 ? '+' : '-'
              }}{{ percentageIncrease == 0 ? '' : percentageIncrease }}%
            </span>
            <span class="font-medium text-[#637381] text-xs">than last week</span>
          </div>
        </div>
        <SkeletonLoading class="w-32 h-6 opacity-30" v-if="props.isLoading" />
      </div>
    </CardComponent>
  </div>
</template>
<script lang="ts" setup>
import CardComponent from '@/components/CardComponent.vue'
import { NETWORK } from '@/constant'
import { computed } from 'vue'
import bagIcon from '@/assets/bag.svg'
import cartIcon from '@/assets/cart.svg'
import personIcon from '@/assets/person.svg'
import uptrendIcon from '@/assets/uptrend.svg'
import SkeletonLoading from '@/components/SkeletonLoading.vue'

const props = defineProps<{
  cardType: string
  amount: number | undefined
  previousAmount?: number | undefined
  isLoading?: boolean | undefined
}>()

const cardClasses = computed(() => {
  return {
    'bg-[#C8FACD] text-[#005249]': props.cardType === 'balance',
    'bg-[#FEF3DE] text-[#6A3B13]': props.cardType === 'month-claims',
    'bg-[#D9F1F6] text-[#0C315A]': props.cardType === 'approved-claims'
  }
})

const cardAttributes = computed(() => {
  return {
    balance: {
      title: 'Total Balance',
      currency: NETWORK.currencySymbol
    },
    'month-claims': {
      title: 'Month Claimed',
      currency: null
    },
    'approved-claims': {
      title: 'Pending Claim',
      currency: null
    }
  }[props.cardType]
})

const cardIcon = computed(() => {
  return {
    balance: bagIcon,
    'month-claims': cartIcon,
    'approved-claims': personIcon
  }[props.cardType]
})

const lastMonthStatusIcon = computed(() => {
  if (props.previousAmount === undefined) return ''
  return props.amount! > props.previousAmount ? uptrendIcon : ''
})

const percentageIncrease = computed(() => {
  if (props.previousAmount === 0) return 0
  const amount = props.amount ?? 0
  const previousAmount = props.previousAmount ?? 0

  return (((amount - previousAmount) / previousAmount) * 100).toFixed(2)
})
</script>
