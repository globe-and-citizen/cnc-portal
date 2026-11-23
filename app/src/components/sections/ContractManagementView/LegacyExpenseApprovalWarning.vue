<template>
  <UAlert
    color="warning"
    variant="soft"
    title="Check older spending approvals before moving funds"
    description="Disable active Expense Account approvals only if their contract version enforces it. Older versions may record Disable without blocking spending. Moving funds does not revoke signatures; they could become spendable again if this account receives funds later. New contract approvals require new signatures."
    data-test="legacy-approval-warning"
  />
  <a :href="`/teams/${teamId}/accounts/expense-account`">Review spending approvals</a>
</template>

<script setup lang="ts">
defineProps<{ teamId: string | null }>()
</script>
