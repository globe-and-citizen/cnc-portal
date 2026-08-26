<template>
  <UCard data-test="payment-gate-history-card">
    <template #header>
      <h3 class="text-base font-semibold">Payment history</h3>
    </template>

    <p class="text-muted mb-4 text-sm">
      Bank deposits that carry a facture ID — every payment made through the widget, read directly
      from the chain. No separate record to keep in sync.
    </p>

    <UAlert
      v-if="error"
      color="error"
      variant="subtle"
      title="Couldn't load payment history"
      :description="error.message"
    />
    <UTable
      v-else
      :data="payments"
      :columns="columns"
      :loading="loading"
      data-test="payment-gate-history-table"
    >
      <template #empty>
        <p class="text-muted py-6 text-center text-sm">No payments yet.</p>
      </template>
    </UTable>
  </UCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import { useTeamStore } from '@/stores'
import { formatTxHash } from '@/utils/format'
import { useFactureHistory, type FacturePayment } from '@/composables/paymentGate/useFactureHistory'

const teamStore = useTeamStore()
const bankAddress = computed(() => teamStore.getContractAddressByType('Bank'))

const { payments, loading, error } = useFactureHistory(bankAddress)

const columns: TableColumn<FacturePayment>[] = [
  { accessorKey: 'factureId', header: 'Facture ID' },
  { accessorKey: 'amount', header: 'Amount' },
  { accessorKey: 'token', header: 'Token' },
  {
    accessorKey: 'txHash',
    header: 'Tx',
    cell: ({ row }) => formatTxHash(row.original.txHash)
  }
]
</script>
