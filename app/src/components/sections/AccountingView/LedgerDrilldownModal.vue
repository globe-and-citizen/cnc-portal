<template>
  <UModal
    v-model:open="open"
    :title="account"
    :description="`General ledger entries composing this line — balance ${total}`"
    :ui="{ content: 'rounded-2xl sm:max-w-5xl' }"
  >
    <template #body>
      <div class="flex flex-col gap-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex items-center gap-2">
            <UBadge
              color="primary"
              variant="subtle"
              :label="`${entryCount} ${entryCount === 1 ? 'entry' : 'entries'}`"
            />
            <span class="text-muted text-sm">
              net to <span class="text-highlighted font-semibold tabular-nums">{{ total }}</span>
            </span>
          </div>
          <div class="flex items-center gap-2">
            <ColumnVisibilitySelect v-model="visibleColumns" :items="columnItems" />
            <UButton
              color="neutral"
              variant="outline"
              size="sm"
              icon="i-heroicons-arrow-down-tray"
              label="Excel"
              data-test="drilldown-export-excel"
              @click="emit('export', 'excel')"
            />
            <UButton
              color="neutral"
              size="sm"
              icon="i-heroicons-printer"
              label="PDF"
              data-test="drilldown-export-pdf"
              @click="emit('export', 'pdf')"
            />
          </div>
        </div>

        <LedgerTable :rows="pageRows" :total="total" :visible-columns="visibleColumns" />

        <TablePagination
          v-model:page="page"
          v-model:page-size="pageSize"
          :total="entryCount"
          noun="entries"
          data-test-prefix="drilldown"
        />
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import LedgerTable from './LedgerTable.vue'
import TablePagination from '@/components/TablePagination.vue'
import ColumnVisibilitySelect from '@/components/ColumnVisibilitySelect.vue'
import {
  ledgerRows,
  LEDGER_COLUMNS,
  type LedgerColumnKey
} from '@/utils/accounting/ledgerPresenter'
import type { LedgerEntry } from '@/utils/accounting/ledgerEntry'

const props = defineProps<{
  account: string
  total: string
  entries: LedgerEntry[]
}>()

const open = defineModel<boolean>('open', { required: true })
// Which ledger columns to show — owned by the parent so the drill-down export
// matches what's on screen; defaults to all when left unbound.
const visibleColumns = defineModel<LedgerColumnKey[]>('columns', {
  default: () => LEDGER_COLUMNS.map((c) => c.value)
})
const emit = defineEmits<{ export: [format: 'pdf' | 'excel'] }>()

const columnItems = [...LEDGER_COLUMNS]

const entryCount = computed(() => props.entries.length)

const page = ref(1)
const pageSize = ref(10)

// A different line (or a reopen) starts back at page one.
watch(
  () => [props.account, open.value] as const,
  () => {
    page.value = 1
  }
)

const pageRows = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return ledgerRows(props.entries.slice(start, start + pageSize.value))
})
</script>
