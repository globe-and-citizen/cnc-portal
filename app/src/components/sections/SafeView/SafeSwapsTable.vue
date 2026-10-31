<template>
  <UCard data-test="safe-swaps-card">
    <template #header>
      <div>
        <h3 class="font-semibold">Swaps</h3>
        <p class="mt-1 text-sm text-gray-500">
          What the Safe gained or lost on the tokens it swapped.
        </p>
      </div>
    </template>

    <UAlert
      v-if="isError"
      color="error"
      variant="soft"
      icon="i-lucide-circle-alert"
      title="Swaps could not be loaded"
      description="Check your connection and reload the page to try again."
      data-test="safe-swaps-error"
    />

    <div
      v-else-if="isLoading || !report"
      class="flex min-h-36 items-center justify-center gap-3 text-sm text-gray-500"
      role="status"
      aria-live="polite"
      data-test="safe-swaps-loading"
    >
      <UIcon name="i-lucide-loader-circle" class="text-primary h-7 w-7 animate-spin" />
      Loading swaps…
    </div>

    <div
      v-else-if="!report.count"
      class="flex min-h-36 flex-col items-center justify-center rounded-lg border border-dashed p-6 text-center"
      data-test="safe-swaps-empty"
    >
      <UIcon name="i-lucide-arrow-left-right" class="text-primary h-7 w-7" />
      <p class="mt-3 font-medium">No swaps yet</p>
      <p class="mt-1 text-sm text-gray-500">Swaps made from this Safe will be listed here.</p>
    </div>

    <template v-else>
      <UTabs :items="tabs" default-value="tokens" variant="link" :ui="{ list: 'overflow-x-auto' }">
        <template #tokens>
          <SafeSwapPositions :positions="report.positions" />
        </template>
        <template #swaps>
          <SafeSwapExchanges :swaps="report.swaps" />
        </template>
      </UTabs>

      <p
        v-if="report.unvaluedTokens.length"
        class="text-warning mt-3 text-xs"
        data-test="safe-swaps-unvalued"
      >
        {{ report.unvaluedTokens.join(', ') }} could not be valued: a price or part of its history
        is missing.
      </p>
    </template>
  </UCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import SafeSwapExchanges from './SafeSwapExchanges.vue'
import SafeSwapPositions from './SafeSwapPositions.vue'
import { useSafeSwapPnl } from '@/composables/safe/useSafeSwapPnl'

const props = defineProps<{ address: string }>()

const { costBasis: report, isLoading, isError } = useSafeSwapPnl(() => props.address)

const tabs = computed(() => [
  { label: 'Tokens', value: 'tokens', slot: 'tokens' as const },
  { label: `Swaps (${report.value?.count ?? 0})`, value: 'swaps', slot: 'swaps' as const }
])
</script>
