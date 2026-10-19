<template>
  <UAlert
    v-if="hasActivePreviousApprovals"
    color="warning"
    variant="soft"
    title="Approvals on a previous contract version"
    description="Active approvals can still spend from their original Expense Account. Some older versions do not enforce Disable. Check each approval and move remaining funds from the old generation in Contract Management; moving funds alone does not revoke signatures."
    data-test="previous-approvals-notice"
  />
  <a
    v-if="hasPreviousApprovals"
    :href="`/teams/${teamId}/contract-management?tab=history`"
    class="text-sm underline"
  >
    Manage older contracts
  </a>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ExpenseResponse } from '@/types/expense-account'

const props = defineProps<{ teamId: string | null; approvals?: ExpenseResponse[] }>()
const hasPreviousApprovals = computed(
  () => props.approvals?.some((row) => row.sourceGeneration === 'previous') ?? false
)
const hasActivePreviousApprovals = computed(
  () =>
    props.approvals?.some(
      (row) => row.sourceGeneration === 'previous' && row.status === 'enabled'
    ) ?? false
)
</script>
