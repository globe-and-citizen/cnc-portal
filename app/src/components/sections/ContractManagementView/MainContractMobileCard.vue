<template>
  <article class="p-4">
    <div class="flex items-start justify-between gap-3">
      <div class="flex min-w-0 items-center gap-3">
        <div class="bg-primary/10 text-primary grid size-10 shrink-0 place-items-center rounded-xl">
          <UIcon :name="presentation.icon" class="size-5" />
        </div>
        <div class="min-w-0">
          <p class="text-highlighted font-medium">{{ presentation.label }}</p>
          <AddressTooltip :address="row.contract.address" :slice="true" class="mt-1 text-xs" />
        </div>
      </div>
      <UBadge :color="row.contract.paused ? 'warning' : 'success'" variant="subtle" size="sm">
        {{ row.contract.paused ? 'Paused' : 'Active' }}
      </UBadge>
    </div>

    <dl class="mt-4 grid grid-cols-2 gap-4 text-sm">
      <div>
        <dt class="text-muted">Balance</dt>
        <dd class="text-default mt-1">
          <MainContractBalanceCell v-if="row.holdsValue" :address="row.contract.address" />
          <span v-else>No balance</span>
        </dd>
      </div>
      <div>
        <dt class="text-muted">Owner</dt>
        <dd class="mt-1"><UserIdentity :user="row.owner" /></dd>
      </div>
    </dl>

    <div v-if="row.actionState" class="border-default mt-4 border-t pt-3">
      <MainContractActionMenu
        :row="row.contract"
        :action-state="row.actionState"
        @view-details="emit('view-details', row.contract)"
        @copy-contract-address="emit('copy-contract-address', row.contract.address)"
        @open-in-explorer="emit('open-in-explorer', row.contract.address)"
        @review-pending-actions="emit('review-pending-actions', row.contract)"
        @transfer-ownership="emit('transfer-ownership', row.contract)"
        @change-status="emit('change-status', row.contract, $event)"
      />
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AddressTooltip from '@/components/ui/AddressTooltip.vue'
import UserIdentity from '@/components/ui/UserIdentity.vue'
import { getContractPresentation } from '@/utils/contracts/presentation'
import MainContractActionMenu from './MainContractActionMenu.vue'
import MainContractBalanceCell from './MainContractBalanceCell.vue'
import type { ContractTableRow } from './MainContractTable.types'

interface Props {
  row: ContractTableRow
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

const presentation = computed(() => getContractPresentation(props.row.contract.type))
</script>
