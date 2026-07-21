<template>
  <div class="border-default bg-default overflow-hidden rounded-2xl border shadow-sm">
    <div class="border-default flex items-center justify-between border-b px-6 py-4">
      <span class="text-base font-semibold">Repayment breakdown</span>
      <UBadge color="primary" variant="subtle" :label="`${rows.length} lenders`" />
    </div>
    <UTable
      :data="rows"
      :columns="columns"
      :meta="{ class: { tr: (row) => (row.original.you ? 'bg-primary/5' : '') } }"
    >
      <template #lender-cell="{ row }">
        <div class="flex items-center gap-2.5">
          <CreditAvatar :name="row.original.name" :gradient="row.original.gradient" :size="30" />
          <div>
            <div class="font-semibold">{{ row.original.name }}</div>
            <div class="text-muted font-mono text-[11px]">{{ row.original.addr }}</div>
          </div>
        </div>
      </template>
      <template #principal-cell="{ row }">
        {{ formatAmount(row.original.amount, token) }}
      </template>
      <template #interest-cell="{ row }">
        <span class="text-primary font-semibold"
          >+ {{ formatAmount(row.original.interest, token) }}</span
        >
      </template>
      <template #total-cell="{ row }">
        <span class="font-bold">{{ formatAmount(row.original.total, token) }}</span>
      </template>
      <template #paid-cell="{ row }">
        <span class="text-muted">{{ formatAmount(row.original.paid, token) }}</span>
      </template>
      <template #remaining-cell="{ row }">
        {{ formatAmount(row.original.remaining, token) }}
      </template>
      <template #empty>
        <div class="text-muted px-4 py-6 text-center text-sm">
          No lenders have funded this round.
        </div>
      </template>
      <template #lender-footer>
        <span class="text-muted text-xs font-semibold">Totals</span>
      </template>
      <template #total-footer>
        <span class="text-base font-bold">{{ formatAmount(totalSum, token) }}</span>
      </template>
      <template #paid-footer>
        <span class="text-muted font-semibold">{{ formatAmount(paidSum, token) }}</span>
      </template>
      <template #remaining-footer>
        {{ formatAmount(remainingSum, token) }}
      </template>
    </UTable>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { formatAmount } from '@/utils'
import type { CreditLender } from '@/types'
import CreditAvatar from './CreditAvatar.vue'

export type RepayBreakdownRow = CreditLender & {
  interest: number
  total: number
  remaining: number
}

const props = defineProps<{
  rows: RepayBreakdownRow[]
  token: string
}>()

function sumBy(key: 'total' | 'paid' | 'remaining') {
  return props.rows.reduce((sum, lender) => sum + lender[key], 0)
}

const rightAlign = { class: { th: 'text-right', td: 'text-right' } }

// `footer: ' '` on the lender column is a placeholder — UTable only renders a <tfoot>
// at all once some column defines one, and every column's own footer content is
// overridden below via the #foo-footer slots regardless of this value.
const columns = [
  { accessorKey: 'lender', header: 'Lender', footer: ' ' },
  { accessorKey: 'principal', header: 'Principal', meta: rightAlign },
  { accessorKey: 'interest', header: 'Interest', meta: rightAlign },
  { accessorKey: 'total', header: 'Total', meta: rightAlign },
  { accessorKey: 'paid', header: 'Paid so far', meta: rightAlign },
  { accessorKey: 'remaining', header: 'Remaining', meta: rightAlign }
]

const totalSum = computed(() => sumBy('total'))
const paidSum = computed(() => sumBy('paid'))
const remainingSum = computed(() => sumBy('remaining'))
</script>
