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

    <RouterView />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import AccountingHeader from './AccountingHeader.vue'
import { provideAccounting } from '@/composables/accounting/useAccountingContext'

const route = useRoute()

// Resolve the team's books once for the complete Accounting route tree. Child
// reports inject this result while their local filters and projections remount.
const accounting = provideAccounting(() => (route.params.id as string) ?? null)
const error = computed(() => accounting.status.value.error)

const reconciliationGaps = computed(() => accounting.status.value.reconciliationGaps)
const gapsDescription = computed(() => {
  const failedSources = [
    ...new Set(reconciliationGaps.value.filter((gap) => gap.address).map((gap) => gap.source))
  ]
  const unmatchedFees = reconciliationGaps.value.filter((gap) => gap.operationId).length
  const messages = []
  if (failedSources.length) {
    messages.push(
      `Some contract generations couldn't be loaded (${failedSources.join(', ')}). Pre-migration history for these may be missing.`
    )
  }
  if (unmatchedFees) {
    messages.push(
      `${unmatchedFees} Bank fee log${unmatchedFees === 1 ? '' : 's'} lacked a matching outflow and ${unmatchedFees === 1 ? 'was' : 'were'} withheld from the journal.`
    )
  }
  return messages.join(' ')
})
</script>
