<template>
  <UModal
    v-model:open="isOpen"
    title="Conflicting Transactions"
    description="You have pending transactions that conflict by nonce; confirming this action will invalidate others."
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
                <p class="text-red font-semibold">Warning: Transaction Conflict Detected</p>
                <p class="text-sm text-gray-700">
                  Confirming this transaction will invalidate the others
                </p>
              </div>
            </div>
          </div>

          <!-- Explanation -->
          <div class="space-y-2 text-sm text-gray-600">
            <p>
              <span class="font-semibold">Why this happens:</span>
              Safe transactions must follow nonce order. This action will invalidates earlier
              nonces.
            </p>
          </div>
        </div>

        <hr />

        <!-- Action Buttons -->
        <div class="flex justify-end gap-3">
          <UButton color="secondary" @click="handleCancel" data-test="cancel-execute-button">
            Cancel
          </UButton>
          <UButton
            color="warning"
            @click="handleConfirm"
            :loading="isExecuting"
            data-test="confirm-execute-button"
          >
            {{ action }} Anyway
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { Icon as IconifyIcon } from '@iconify/vue'

interface Props {
  isExecuting?: boolean
  action?: string
}

withDefaults(defineProps<Props>(), {
  isExecuting: false,
  action: 'Confirm'
})

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

const isOpen = defineModel<boolean>({ required: true })

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
