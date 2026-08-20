<template>
  <UCard data-test="payment-gate-history-card">
    <template #header>
      <h3 class="text-base font-semibold">Payment history</h3>
    </template>

    <p class="text-muted mb-4 text-sm">
      Payments made through the widget — each entry only exists because the widget successfully
      reported its <code>txHash</code> for that facture ID (see Reference).
    </p>

    <UTable :data="payments" :columns="columns" data-test="payment-gate-history-table">
      <template #status-cell="{ row }">
        <UBadge :color="statusColor(row.original.status)" variant="subtle" size="xs">
          {{ row.original.status }}
        </UBadge>
      </template>
    </UTable>
  </UCard>
</template>

<script setup lang="ts">
import { formatToken } from '@/utils/format'

type PaymentStatus = 'pending' | 'paid' | 'failed'

interface HistoryRow {
  factureId: string
  amount: string
  token: string
  status: PaymentStatus
}

const payments: HistoryRow[] = [
  { factureId: 'order_8842', amount: formatToken(128, 'USDC'), token: 'USDC', status: 'paid' },
  { factureId: 'order_8841', amount: formatToken(64, 'USDC'), token: 'USDC', status: 'paid' },
  { factureId: 'order_8840', amount: formatToken(32, 'USDC'), token: 'USDC', status: 'failed' },
  { factureId: 'order_8839', amount: formatToken(96, 'USDC'), token: 'USDC', status: 'pending' }
]

const columns = [
  { accessorKey: 'factureId', header: 'Facture ID' },
  { accessorKey: 'amount', header: 'Amount' },
  { accessorKey: 'token', header: 'Token' },
  { accessorKey: 'status', header: 'Status' }
]

function statusColor(status: PaymentStatus) {
  if (status === 'paid') return 'success' as const
  if (status === 'failed') return 'error' as const
  return 'neutral' as const
}
</script>
