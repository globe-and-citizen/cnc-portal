<template>
  <UTable
    v-if="rows.length || isRefreshing"
    class="hidden md:block"
    :data="rows"
    :columns="columns"
    :loading="isRefreshing"
    :ui="{
      th: 'text-xs uppercase tracking-wide text-muted',
      td: 'py-4',
      tr: 'hover:bg-elevated/40 transition-colors'
    }"
  >
    <template #contract-cell="{ row: { original: row } }">
      <div class="flex min-w-96 items-center gap-3">
        <div class="bg-primary/10 text-primary grid size-10 shrink-0 place-items-center rounded-xl">
          <UIcon :name="presentation(row.contract.type).icon" class="size-5" />
        </div>
        <div class="min-w-0">
          <p class="text-highlighted font-medium">{{ presentation(row.contract.type).label }}</p>
          <AddressTooltip
            :address="row.contract.address"
            class="text-muted mt-1 font-mono text-xs whitespace-nowrap"
          />
        </div>
      </div>
    </template>

    <template #status-cell="{ row: { original: row } }">
      <UBadge
        :color="row.contract.paused ? 'warning' : 'success'"
        variant="subtle"
        size="sm"
        class="gap-1.5"
      >
        <span
          class="size-1.5 rounded-full"
          :class="row.contract.paused ? 'bg-warning' : 'bg-success'"
        />
        {{ row.contract.paused ? 'Paused' : 'Active' }}
      </UBadge>
    </template>

    <template #balance-cell="{ row: { original: row } }">
      <MainContractBalanceCell v-if="row.holdsValue" :address="row.contract.address" />
      <span v-else class="text-muted text-xs">No balance</span>
    </template>

    <template #owner-cell="{ row: { original: row } }">
      <UserIdentity :user="row.owner" />
    </template>

    <template #actions-cell="{ row: { original: row } }">
      <MainContractActionMenu
        v-if="row.actionState"
        :row="row.contract"
        :action-state="row.actionState"
        @view-details="emit('view-details', row.contract)"
        @copy-contract-address="emit('copy-contract-address', row.contract.address)"
        @open-in-explorer="emit('open-in-explorer', row.contract.address)"
        @review-pending-actions="emit('review-pending-actions', row.contract)"
        @transfer-ownership="emit('transfer-ownership', row.contract)"
        @change-status="emit('change-status', row.contract, $event)"
      />
    </template>
  </UTable>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AddressTooltip from '@/components/ui/AddressTooltip.vue'
import UserIdentity from '@/components/ui/UserIdentity.vue'
import { getContractPresentation } from '@/utils'
import MainContractActionMenu from './MainContractActionMenu.vue'
import MainContractBalanceCell from './MainContractBalanceCell.vue'
import type { ContractTableRow } from './MainContractTable.types'

interface Props {
  rows: ContractTableRow[]
  isRefreshing: boolean
  showActions: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'view-details': [row: ContractTableRow['contract']]
  'copy-contract-address': [address: string]
  'open-in-explorer': [address: string]
  'review-pending-actions': [row: ContractTableRow['contract']]
  'transfer-ownership': [row: ContractTableRow['contract']]
  'change-status': [row: ContractTableRow['contract'], paused: boolean]
}>()

const columns = computed(() => [
  { accessorKey: 'contract', header: 'Contract' },
  { accessorKey: 'status', header: 'Status' },
  { accessorKey: 'balance', header: 'Balance' },
  { accessorKey: 'owner', header: 'Owner' },
  ...(props.showActions ? [{ accessorKey: 'actions', header: 'Pending / Actions' }] : [])
])
const presentation = (type: string) => getContractPresentation(type)
</script>
