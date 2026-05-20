<script setup lang="ts">
import { formatUsd6 } from '~/utils/accounting'
import type { GeneralLedger } from '~/utils/generalLedger'

/**
 * Renders the trial balance + balanced/not-balanced status. Lifted out of the
 * deleted AccountingGeneralLedger so the merged Activity Ledger can show it
 * inline under the table.
 */
defineProps<{ ledger: GeneralLedger }>()
</script>

<template>
  <div>
    <h3 class="font-semibold text-black dark:text-white mb-4">
      Trial Balance
    </h3>
    <div class="max-w-2xl">
      <div class="grid grid-cols-4 gap-2 text-xs uppercase tracking-wide text-muted border-b border-default pb-2">
        <span>Account</span>
        <span class="text-right">Debit</span>
        <span class="text-right">Credit</span>
        <span class="text-right">Balance</span>
      </div>
      <div
        v-for="acc in ledger.trialBalance"
        :key="acc.account"
        class="grid grid-cols-4 gap-2 py-1.5 border-b border-default text-sm"
      >
        <span>
          {{ acc.account }}
          <span class="text-muted text-xs">({{ acc.accountClass.toLowerCase() }})</span>
        </span>
        <span class="text-right tabular-nums">{{ acc.totalDebit ? formatUsd6(acc.totalDebit) : '—' }}</span>
        <span class="text-right tabular-nums">{{ acc.totalCredit ? formatUsd6(acc.totalCredit) : '—' }}</span>
        <span class="text-right tabular-nums font-medium">{{ formatUsd6(acc.balance) }}</span>
      </div>
      <div class="grid grid-cols-4 gap-2 py-2 font-semibold border-b-2 border-default">
        <span>Total</span>
        <span class="text-right tabular-nums">{{ formatUsd6(ledger.totalDebit) }}</span>
        <span class="text-right tabular-nums">{{ formatUsd6(ledger.totalCredit) }}</span>
        <span />
      </div>
      <p
        class="mt-3 text-sm flex items-center gap-2"
        :class="ledger.balanced ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'"
      >
        <UIcon :name="ledger.balanced ? 'i-lucide-check-circle' : 'i-lucide-alert-triangle'" class="w-4 h-4" />
        {{ ledger.balanced ? 'Debits equal credits — books balance.' : 'Debits and credits differ — check the data.' }}
      </p>
    </div>
  </div>
</template>
