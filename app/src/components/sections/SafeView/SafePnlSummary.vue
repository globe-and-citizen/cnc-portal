<script setup lang="ts">
import type { SafePnl } from '@/utils/accounting/safePnl'
import { pnlLabel } from '@/utils/accounting/safePnlPresenter'
import { money } from '@/utils/accounting/presenter'
defineProps<{ pnl: SafePnl; feesHref?: string }>()
defineEmits<{ retry: [] }>()
</script>

<template>
  <div class="mt-4 space-y-3" data-test="safe-pnl-summary">
    <p class="text-sm font-medium">Treasury summary · USD · All time</p>
    <dl class="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <div>
        <dt class="text-xs text-gray-500">Net asset cost</dt>
        <dd>{{ pnl.basis === null ? 'Unavailable' : money(pnl.basis) }}</dd>
      </div>
      <div>
        <dt class="text-xs text-gray-500">Current market value</dt>
        <dd>{{ pnl.market === null ? 'Unavailable' : money(pnl.market) }}</dd>
      </div>
      <div>
        <dt class="text-xs text-gray-500">Swap fees</dt>
        <dd data-test="pnl-swap-fees">
          <a
            v-if="feesHref && pnl.fees != null"
            :href="feesHref"
            class="text-primary underline underline-offset-2"
            data-test="pnl-swap-fees-link"
            >{{ money(pnl.fees) }}</a
          >
          <template v-else>{{ pnl.fees == null ? 'Unavailable' : money(pnl.fees) }}</template>
        </dd>
      </div>
      <div>
        <dt class="text-xs text-gray-500">Total P&amp;L</dt>
        <dd class="font-semibold" data-test="pnl-total">{{ pnlLabel(pnl.total) }}</dd>
      </div>
    </dl>
    <p class="text-xs text-gray-500">
      Verified swap fees are shown apart from the asset cost; unverified ones stay inside it. Either
      way they count once in total P&amp;L. Deposits and withdrawals are not profit.
    </p>
    <p v-if="!pnl.complete" class="text-sm text-amber-700" data-test="pnl-incomplete">
      P&amp;L is unavailable until accounting history, cost basis and wallet quantities reconcile.
    </p>
    <UButton
      v-if="!pnl.complete"
      size="xs"
      variant="outline"
      label="Retry P&L"
      data-test="retry-safe-pnl"
      @click="$emit('retry')"
    />
  </div>
</template>
