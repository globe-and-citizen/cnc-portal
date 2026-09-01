<template>
  <div class="flex items-center justify-end gap-2">
    <UButton
      v-if="actionState.pendingActionCount"
      color="warning"
      variant="subtle"
      size="sm"
      :label="`${actionState.pendingActionCount} Review`"
      icon="i-lucide-clock-3"
      :disabled="!actionState.canReviewPendingActions"
      @click="emit('review-pending-actions')"
    />
    <span v-else class="text-muted hidden items-center gap-1 text-xs lg:inline-flex">
      <UBadge color="neutral" variant="subtle" size="sm" label="0" />
      None
    </span>

    <UDropdownMenu :items="menuItems" :content="{ align: 'end' }">
      <UButton
        color="neutral"
        variant="ghost"
        size="sm"
        icon="i-lucide-ellipsis"
        aria-label="Contract actions"
        data-test="contract-actions-menu"
      />
    </UDropdownMenu>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { DropdownMenuItem } from '@nuxt/ui'
import type { TableRow } from '@/types/table'
import type { ContractActionState } from './MainContractTable.types'

interface Props {
  row: TableRow
  actionState: ContractActionState
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'view-details': []
  'copy-contract-address': []
  'open-in-explorer': []
  'review-pending-actions': []
  'transfer-ownership': []
  'change-status': [paused: boolean]
}>()

const menuItems = computed<DropdownMenuItem[][]>(() => [
  [
    {
      label: 'View contract details',
      icon: 'i-lucide-panel-right-open',
      onSelect: () => emit('view-details')
    },
    {
      label: 'Copy contract address',
      icon: 'i-lucide-copy',
      onSelect: () => emit('copy-contract-address')
    },
    {
      label: 'Open in explorer',
      icon: 'i-lucide-external-link',
      onSelect: () => emit('open-in-explorer')
    }
  ],
  [
    {
      label: props.actionState.pendingActionCount
        ? `Review pending actions (${props.actionState.pendingActionCount})`
        : 'No pending actions',
      icon: 'i-lucide-clock-3',
      disabled: !props.actionState.canReviewPendingActions,
      onSelect: () => emit('review-pending-actions')
    },
    {
      label: 'Transfer ownership',
      icon: 'i-lucide-arrow-left-right',
      disabled: !props.actionState.canManage,
      onSelect: () => emit('transfer-ownership')
    },
    {
      label: props.row.paused ? 'Resume contract' : 'Pause contract',
      icon: props.row.paused ? 'i-lucide-play' : 'i-lucide-pause',
      color: props.row.paused ? 'success' : 'error',
      disabled: !props.actionState.canManage,
      onSelect: () => emit('change-status', Boolean(props.row.paused))
    }
  ]
])
</script>
