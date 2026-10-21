<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { SwapFeeEvidence } from '@/types/swapFees'
import type { JournalEntry } from '@/utils/accounting/types'
import { swapBooking, swapDate, swapLabel } from '@/utils/accounting/swapPresenter'
import SwapFeesDetails from './SwapFeesDetails.vue'

const props = defineProps<{
  swaps: readonly SwapFeeEvidence[]
  journal: readonly JournalEntry[]
  incomplete: boolean
}>()
defineEmits<{ retry: [] }>()
const page = ref(0)
const pageSize = 5
const visible = computed(() =>
  props.swaps.slice(page.value * pageSize, (page.value + 1) * pageSize)
)
watch(
  () => props.swaps.length,
  () => {
    page.value = Math.min(page.value, Math.max(0, Math.ceil(props.swaps.length / pageSize) - 1))
  }
)
</script>

<template>
  <UCard id="safe-swap-costs" class="scroll-mt-4" data-test="executed-swap-fees">
    <template #header><h3 class="font-semibold">Swap costs</h3></template>
    <p class="text-muted mb-3 text-sm">
      What each completed swap cost in fees, and how it was booked.
    </p>
    <p v-if="incomplete" class="text-warning mb-3 text-sm" data-test="swap-fee-history-incomplete">
      History is incomplete; some executed swaps may be missing.
    </p>
    <p v-if="!swaps.length" class="text-muted text-sm" data-test="swap-fees-empty">
      No confirmed swaps available.
    </p>
    <ul v-else class="divide-default divide-y">
      <li
        v-for="swap in visible"
        :key="`${swap.target.safeAddress}:${swap.target.txHash}`"
        class="py-4 first:pt-0 last:pb-0"
      >
        <div class="flex flex-wrap items-center justify-between gap-2">
          <span class="font-medium">{{ swapLabel(swap.target) }}</span>
          <span class="text-muted text-sm">{{ swapDate(swap.target) }}</span>
        </div>
        <SwapFeesDetails
          :swap="swap"
          :booking="swapBooking(journal, swap.target)"
          @retry="$emit('retry')"
        />
      </li>
    </ul>
    <div v-if="swaps.length > pageSize" class="mt-4 flex justify-end gap-2">
      <UButton
        size="xs"
        variant="outline"
        :disabled="page === 0"
        data-test="swap-fees-previous"
        @click="page--"
        >Previous</UButton
      >
      <UButton
        size="xs"
        variant="outline"
        :disabled="(page + 1) * pageSize >= swaps.length"
        data-test="swap-fees-next"
        @click="page++"
        >Next</UButton
      >
    </div>
  </UCard>
</template>
