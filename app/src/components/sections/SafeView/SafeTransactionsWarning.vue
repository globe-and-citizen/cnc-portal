<template>
  <UModal
    v-model:open="isOpen"
    title="Review transaction conflict"
    description="Another transaction is pending. Continuing may make a different pending action invalid."
    :close="{ onClick: handleClose }"
  >
    <template #body>
      <div class="flex max-w-md flex-col gap-5">
        <div class="flex items-center justify-between">
          <!-- Title is provided by modal header -->
        </div>

        <hr />

        <div class="space-y-4">
          <!-- Warning Message -->
          <div class="bg-warning/10 border-warning rounded-lg border p-4">
            <div class="flex items-start gap-3">
              <IconifyIcon
                icon="heroicons:exclamation-triangle"
                class="text-red mt-0.5 h-6 w-6 shrink-0"
              />
              <div class="space-y-2">
                <p class="text-red font-semibold">This action may affect another transaction</p>
                <p class="text-sm text-gray-700">
                  Review the pending queue before you continue. Safe transactions execute in nonce
                  order, so continuing with one action can change whether another remains
                  executable.
                </p>
              </div>
            </div>
          </div>

          <!-- Explanation -->
          <div class="space-y-2 text-sm text-gray-600">
            <p><span class="font-semibold">What happens next:</span> {{ actionExplanation }}</p>
          </div>
        </div>

        <hr />

        <!-- Action Buttons -->
        <div class="flex justify-end gap-3">
          <UButton color="secondary" data-test="cancel-execute-button" @click="handleCancel">
            Cancel
          </UButton>
          <UButton
            color="warning"
            :loading="isExecuting"
            data-test="confirm-execute-button"
            @click="handleConfirm"
          >
            {{ action }} Anyway
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Icon as IconifyIcon } from '@iconify/vue'

interface Props {
  isExecuting?: boolean
  action?: string
}

const props = withDefaults(defineProps<Props>(), {
  isExecuting: false,
  action: 'Confirm'
})

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

const isOpen = defineModel<boolean>({ required: true })

const actionExplanation = computed(() =>
  props.action === 'Approve'
    ? 'Your approval will be recorded. If it reaches the threshold, signers should resolve the conflict before execution.'
    : 'The Safe will submit this transaction for execution. Another pending transaction may then become invalid.'
)

const handleConfirm = () => {
  emit('confirm')
}

const handleCancel = () => {
  isOpen.value = false
  emit('cancel')
}

const handleClose = () => {
  isOpen.value = false
  emit('cancel')
}
</script>
