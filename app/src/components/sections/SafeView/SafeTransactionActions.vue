<template>
  <div class="flex flex-wrap items-center gap-2">
    <UButton
      size="xs"
      color="neutral"
      variant="ghost"
      icon="i-lucide-eye"
      label="Details"
      aria-label="View transaction details"
      data-test="view-details-button"
      @click="emit('view')"
    />
    <UButton
      size="xs"
      color="primary"
      label="Approve"
      :title="approveHint"
      :aria-label="`Approve transaction. ${approveHint}`"
      :disabled="!canApprove || actionsDisabled"
      :loading="isApproving"
      data-test="approve-button"
      @click="emit('approve')"
    />
    <UButton
      size="xs"
      color="success"
      label="Execute"
      :title="executeHint"
      :aria-label="`Execute transaction. ${executeHint}`"
      :disabled="!canExecute || actionsDisabled"
      :loading="isExecuting"
      data-test="execute-button"
      @click="emit('execute')"
    />
  </div>
</template>

<script setup lang="ts">
interface Props {
  canApprove: boolean
  canExecute: boolean
  approveHint: string
  executeHint: string
  isApproving?: boolean
  isExecuting?: boolean
  actionsDisabled?: boolean
}

withDefaults(defineProps<Props>(), {
  isApproving: false,
  isExecuting: false,
  actionsDisabled: false
})

const emit = defineEmits<{
  view: []
  approve: []
  execute: []
}>()
</script>
