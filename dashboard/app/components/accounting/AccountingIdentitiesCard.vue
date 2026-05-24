<template>
  <UPageCard v-if="hasAddress" variant="subtle">
    <div class="flex items-center justify-between mb-4">
      <h3 class="font-semibold text-black dark:text-white">
        Accounting identities
      </h3>
      <UBadge
        :color="allGood ? 'success' : 'warning'"
        variant="subtle"
        :icon="allGood ? 'i-lucide-check-circle' : 'i-lucide-alert-triangle'"
      >
        {{ allGood ? 'Books reconciled' : 'Reconciliation gap' }}
      </UBadge>
    </div>

    <p class="text-xs text-muted mb-3">
      Every line below must hold for the books to be internally consistent.
      Click a row to see how it is computed.
    </p>

    <div class="space-y-1">
      <div
        v-for="id in identities"
        :key="id.id"
        class="grid grid-cols-12 gap-2 text-sm py-1.5 border-b border-default last:border-b-0"
        :class="id.asOfTodayOnly ? 'opacity-60' : ''"
      >
        <div class="col-span-1 flex items-center">
          <UIcon
            :name="id.holds || id.asOfTodayOnly ? 'i-lucide-check-circle' : 'i-lucide-alert-triangle'"
            class="w-4 h-4"
            :class="id.holds ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'"
          />
        </div>
        <div class="col-span-5">
          <p class="font-medium">
            {{ id.label }}
          </p>
          <p class="text-xs text-muted">
            {{ id.lhsLabel }} = {{ id.rhsLabel }}
          </p>
        </div>
        <div class="col-span-5 text-right tabular-nums text-xs">
          <p>{{ valueDisplay(id, id.lhs) }} = {{ valueDisplay(id, id.rhs) }}</p>
          <p class="text-muted">
            gap {{ gapDisplay(id) }}
          </p>
        </div>
        <div class="col-span-1 flex justify-end items-center">
          <UTooltip v-if="id.asOfTodayOnly" text="Meaningful only as of today (live /positions data)">
            <UIcon name="i-lucide-info" class="w-4 h-4 text-muted" />
          </UTooltip>
        </div>
      </div>
    </div>
  </UPageCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { AccountingIdentity } from '~/utils/accountingIdentities'
import { formatSignedUsd, formatUsd } from '~/utils/accounting'

/**
 * Lists the 8 accounting identities with a status badge + gap.
 *
 * A green check means the identity holds within its tolerance; an amber alert
 * surfaces a non-zero gap so the user can pinpoint which part of the data is
 * inconsistent (truncated transfer history, missing market, etc.).
 */
const props = defineProps<{
  identities: AccountingIdentity[]
  hasAddress: boolean
}>()

const allGood = computed(() => props.identities.every(id => id.holds || id.asOfTodayOnly))

function gapDisplay(id: AccountingIdentity): string {
  // Lot cap is in shares, not USD — render as a plain number.
  if (id.id === 'LOT_CAP') {
    return id.gap === 0 ? '0 shares' : `${id.gap.toFixed(4)} shares`
  }
  return formatSignedUsd(id.gap)
}

function valueDisplay(id: AccountingIdentity, value: number): string {
  if (id.id === 'LOT_CAP') {
    return value === 0 ? '0' : value.toFixed(4)
  }
  return formatUsd(value)
}
</script>
