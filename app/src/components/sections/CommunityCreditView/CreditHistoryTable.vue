<template>
  <div class="border-default bg-default overflow-hidden rounded-2xl border shadow-sm">
    <UTable
      :data="rows"
      :columns="columns"
      data-test="credit-history-table"
      :ui="{ tr: 'cursor-pointer' }"
      @select="(_, row) => emit('select', row.original.round)"
    >
      <template #round-cell="{ row }">
        <div class="flex items-center gap-3">
          <span
            class="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-lg"
            :class="row.original.iconClass"
          >
            <UIcon :name="row.original.icon" class="size-4" />
          </span>
          <div class="min-w-0">
            <div class="text-sm font-semibold">{{ row.original.round.name }}</div>
            <div class="text-muted max-w-[320px] truncate text-xs">
              {{ row.original.round.desc }}
            </div>
          </div>
        </div>
      </template>
      <template #status-cell="{ row }">
        <UBadge
          :color="row.original.status.color"
          variant="subtle"
          :label="row.original.status.label"
        />
      </template>
      <template #raised-cell="{ row }">
        <span class="font-bold">{{ row.original.raised }}</span>
      </template>
      <template #rate-cell="{ row }">
        <span class="font-mono text-sm">{{ row.original.round.rate }}%</span>
      </template>
      <template #term-cell="{ row }">
        <span class="text-muted">{{ row.original.round.period }}d</span>
      </template>
      <template #outcome-cell="{ row }">
        <span class="text-muted">{{ row.original.outcome }}</span>
      </template>
      <template #action-cell="{ row }">
        <UButton
          variant="soft"
          color="primary"
          size="sm"
          label="View"
          trailing-icon="heroicons:arrow-right"
          data-test="credit-history-view-button"
          @click.stop="emit('select', row.original.round)"
        />
      </template>
    </UTable>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useCommunityCreditStore } from '@/stores'
import { formatAmount, statusMeta } from '@/utils'
import type { CreditRound } from '@/types'

const emit = defineEmits<{ select: [round: CreditRound] }>()

const store = useCommunityCreditStore()

// History = rounds no longer raising: stalled past their deadline awaiting a
// refund/accept decision, fully funded and awaiting repayment, fully repaid, or
// refundable after a missed deadline.
const rows = computed(() =>
  store.historyRounds.map((round) => {
    const outcome =
      round.status === 'stalled'
        ? 'Deadline passed — awaiting refund or acceptance'
        : round.status === 'refundable'
          ? 'Refund available'
          : round.status === 'funded'
            ? `Awaiting repayment · matures ${round.maturity}`
            : round.status === 'active'
              ? `Repaying · matures ${round.maturity}`
              : `Repaid ${round.repaidOn ?? round.maturity}`
    const icon =
      round.status === 'stalled'
        ? 'heroicons:exclamation-triangle'
        : round.status === 'refundable'
          ? 'heroicons:arrow-uturn-left'
          : round.status === 'funded' || round.status === 'active'
            ? 'heroicons:clock'
            : 'heroicons:check-badge'
    const iconClass =
      round.status === 'stalled'
        ? 'bg-warning/10 text-warning'
        : round.status === 'refundable'
          ? 'bg-warning/10 text-warning'
          : round.status === 'funded' || round.status === 'active'
            ? 'bg-info/10 text-info'
            : 'bg-success/10 text-success'
    return {
      round,
      status: statusMeta(round.status),
      raised: formatAmount(round.raised, round.token),
      outcome,
      icon,
      iconClass
    }
  })
)

const rightAlign = { class: { th: 'text-right', td: 'text-right' } }

const columns = [
  { accessorKey: 'round', header: 'Round', meta: { class: { th: 'w-[34%]' } } },
  { accessorKey: 'status', header: 'Status' },
  { accessorKey: 'raised', header: 'Raised', meta: rightAlign },
  { accessorKey: 'rate', header: 'Rate', meta: rightAlign },
  { accessorKey: 'term', header: 'Term', meta: rightAlign },
  { accessorKey: 'outcome', header: 'Outcome', meta: rightAlign },
  {
    accessorKey: 'action',
    header: 'Action',
    meta: { class: { th: 'text-right w-[110px]', td: 'text-right' } }
  }
]
</script>
