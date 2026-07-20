<template>
  <div class="relative overflow-hidden rounded-2xl bg-[#0f3d2e] px-8 py-7" data-test="credit-hero">
    <div class="absolute -top-12 -right-12 h-60 w-60 rounded-full bg-[#00bf7a]/12"></div>

    <div class="relative grid items-center gap-11 lg:grid-cols-[1.15fr_1fr]">
      <!-- Headline figure -->
      <div>
        <div class="text-sm font-medium text-white/65">Credit Account · Outstanding principal</div>
        <div class="mt-1.5 text-[46px] leading-tight font-extrabold tracking-tight text-white">
          {{ formatAmount(store.outstandingPrincipal) }}
        </div>
        <div class="mt-1.5 font-mono text-sm text-[#7fd9b6]">
          + {{ formatAmount(store.interestDue) }} interest due at maturity
        </div>
        <div class="mt-4 flex flex-wrap gap-2.5">
          <span
            v-for="chip in chips"
            :key="chip.text"
            class="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/90"
          >
            <UIcon :name="chip.icon" class="size-3.5" />
            {{ chip.text }}
          </span>
        </div>
      </div>

      <!-- Stat tiles -->
      <div class="grid grid-cols-2 gap-3">
        <div
          v-for="card in cards"
          :key="card.label"
          class="rounded-xl border border-white/12 bg-white/[0.07] px-4 py-3.5"
        >
          <div class="text-[11px] font-medium text-white/60">{{ card.label }}</div>
          <div class="mt-1 text-lg font-bold text-white">{{ card.value }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useCommunityCreditStore } from '@/stores'
import { formatAmount } from '@/utils'

const store = useCommunityCreditStore()

const chips = computed(() => [
  {
    icon: 'heroicons:bolt',
    text: `${store.activeRounds.length} rounds raising or in repayment`
  },
  { icon: 'heroicons:check-circle', text: `${store.historyRounds.length} settled` }
])

const cards = computed(() => [
  { label: 'Raised lifetime', value: formatAmount(store.raisedLifetime) },
  { label: 'Repaid lifetime', value: formatAmount(store.repaidLifetime) },
  { label: 'Active rounds', value: String(store.activeRounds.length) },
  { label: 'Next maturity', value: store.nextMaturity }
])
</script>
