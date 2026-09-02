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
      <template #date-cell="{ row }">
        <div class="font-medium">{{ formatDateRelative(String(row.original.date)) }}</div>
        <div class="text-muted text-xs">{{ formatDateUTC(String(row.original.date)) }}</div>
      </template>

      <template #value-cell="{ row }">
        <div class="text-success font-medium">
          +{{ formatCryptoAmount(row.original.amount) }} {{ row.original.token }}
        </div>
      </template>

      <template #tx-cell="{ row }">
        <UTooltip text="View transaction details">
          <UButton
            :label="formatTxHash(row.original.txHash)"
            trailing-icon="heroicons:arrow-top-right-on-square"
            color="primary"
            variant="outline"
            size="sm"
            data-test="payment-gate-history-detail-button"
            @click="openDetail(row.original)"
          />
        </UTooltip>
      </template>

      <template #empty>
        <p class="text-muted py-6 text-center text-sm">No payments yet.</p>
      </template>
    </UTable>
  </UCard>

  <TransactionDetailSlideover
    v-if="selectedTx"
    v-model:open="showDetail"
    :transaction="selectedTx"
  />
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import { useTeamStore } from '@/stores'
import { formatTxHash } from '@/utils/transactions/registry'
import { formatCryptoAmount } from '@/utils/currency/display'
import { formatDateRelative, formatDateUTC } from '@/utils/dates/calendar'
import TransactionDetailSlideover from '@/components/ui/TransactionDetailSlideover.vue'
import { useFactureHistory, type FacturePayment } from '@/composables/paymentGate/useFactureHistory'

const teamStore = useTeamStore()
const bankAddress = computed(() => teamStore.getContractAddressByType('Bank'))

const { payments, loading, error } = useFactureHistory(bankAddress)

const columns: TableColumn<FacturePayment>[] = [
  { accessorKey: 'factureId', header: 'Facture ID' },
  { accessorKey: 'date', header: 'Date' },
  { accessorKey: 'value', header: 'Amount' },
  { accessorKey: 'tx', header: 'Tx Hash' }
]

const selectedTx = ref<FacturePayment>()
const showDetail = ref(false)

function openDetail(payment: FacturePayment) {
  selectedTx.value = payment
  showDetail.value = true
}
</script>
