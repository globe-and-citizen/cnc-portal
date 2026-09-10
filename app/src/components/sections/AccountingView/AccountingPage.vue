<template>
  <div class="flex flex-col gap-5">
    <AccountingHeader />

    <UAlert
      v-if="state === 'failed'"
      color="error"
      variant="soft"
      icon="i-heroicons-exclamation-triangle"
      title="Couldn't load accounting data"
      description="The company source is unavailable, so no accounting report can be produced."
      data-test="accounting-error"
    />

    <UAlert
      v-else-if="state === 'loading'"
      color="neutral"
      variant="soft"
      icon="i-heroicons-arrow-path"
      title="Accounting data is still loading"
      description="Reports will be available after every applicable source has finished loading."
      data-test="accounting-loading"
    />

    <UAlert
      v-else-if="state === 'partial'"
      color="warning"
      variant="soft"
      icon="i-heroicons-exclamation-triangle"
      title="Accounting data is incomplete"
      data-test="accounting-gaps"
    >
      <template #description>
        <p>Reports are withheld until every material source is available.</p>
        <ul class="mt-2 list-disc space-y-1 pl-5">
          <li v-for="(diagnostic, index) in diagnostics" :key="`${diagnostic.kind}-${index}`">
            {{ diagnosticMessage(diagnostic) }}
          </li>
        </ul>
      </template>
    </UAlert>

    <RouterView v-if="state === 'ready'" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import AccountingHeader from './AccountingHeader.vue'
import { provideAccounting } from '@/composables/accounting/useAccountingContext'
import { formatAddress, formatTxHash } from '@/utils/format'
import type { AccountingDiagnostic, AccountingSourceId } from '@/utils/accounting/types'

const route = useRoute()

// Resolve the team's books once for the complete Accounting route tree. Child
// reports inject this result while their local filters and projections remount.
const accounting = provideAccounting(() => (route.params.id as string) ?? null)
const state = computed(() => accounting.status.state.value)
const diagnostics = computed(() => accounting.status.diagnostics.value)
const sourceLabels = computed(
  () => new Map(accounting.status.sources.value.map(({ source, label }) => [source, label]))
)

function sourceLabel(source: AccountingSourceId): string {
  return sourceLabels.value.get(source) ?? source
}

function diagnosticMessage(diagnostic: AccountingDiagnostic): string {
  switch (diagnostic.kind) {
    case 'source-unavailable':
      return `${sourceLabel(diagnostic.source)} could not be loaded.`
    case 'source-scan-failed':
      return `${sourceLabel(diagnostic.source)} could not scan contract ${formatAddress(diagnostic.address)}.`
    case 'block-timestamp-unavailable': {
      const operation = diagnostic.txHash
        ? `transaction ${formatTxHash(diagnostic.txHash)}`
        : `block ${diagnostic.blockNumber ?? 'unknown'}`
      return `${sourceLabel(diagnostic.source)} withheld ${operation} because its block timestamp is unavailable.`
    }
    case 'orphan-bank-fee':
      return `Bank fee ${formatTxHash(diagnostic.txHash)} was withheld because its matching outflow is unavailable.`
    case 'receipt-unavailable':
      return `Transaction receipt ${formatTxHash(diagnostic.txHash)} could not be loaded.`
    case 'rate-unavailable':
      return `${diagnostic.token.toUpperCase()} movements were withheld because their USD rate is unavailable.`
    default: {
      const exhaustive: never = diagnostic
      return exhaustive
    }
  }
}
</script>
