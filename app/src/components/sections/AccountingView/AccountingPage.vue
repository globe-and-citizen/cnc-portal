<template>
  <div class="flex flex-col gap-5">
    <AccountingHeader />

    <UAlert
      v-if="error"
      color="error"
      variant="soft"
      icon="i-heroicons-exclamation-triangle"
      title="Couldn't load the accounting data"
      description="Some on-chain or backend sources failed to load. Figures may be incomplete."
      data-test="accounting-error"
    />

    <UAlert
      v-if="reconciliationGaps.length"
      color="warning"
      variant="soft"
      icon="i-heroicons-exclamation-triangle"
      title="History may be incomplete"
      :description="gapsDescription"
      data-test="accounting-gaps"
    />

    <slot />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AccountingHeader from './AccountingHeader.vue'
import { provideAccounting } from '@/composables/accounting/useAccountingContext'

const route = useRoute()

// Resolve the team's books once here; the slotted section injects them via
// `useAccountingContext` (its export bar included) instead of re-fetching.
const accounting = provideAccounting(() => (route.params.id as string) ?? null)
const error = computed(() => accounting.error.value)

const reconciliationGaps = computed(() => accounting.reconciliationGaps.value)
const gapsDescription = computed(() => {
  const sources = [...new Set(reconciliationGaps.value.map((gap) => gap.source))]
  return `Some contract generations couldn't be loaded (${sources.join(', ')}). Pre-migration history for these may be missing.`
})
</script>
