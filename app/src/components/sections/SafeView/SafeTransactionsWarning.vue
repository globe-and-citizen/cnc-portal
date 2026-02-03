<template>
  <ModalComponent v-model="isOpen" @reset="handleClose">
    <div class="flex flex-col gap-5 max-w-md">
      <div class="flex items-center justify-between">
        <h2 class="font-bold text-2xl">Conflicting Transactions</h2>
      </div>

      <hr />

      <div class="space-y-4">
        <!-- Warning Message -->
        <div class="bg-warning/10 border border-warning rounded-lg p-4">
          <div class="flex items-start gap-3">
            <IconifyIcon
              icon="heroicons:exclamation-triangle"
              class="w-6 h-6 text-red mt-0.5 flex-shrink-0"
            />
            <div class="space-y-2">
              <p class="font-semibold text-red">Warning: Transaction Conflict Detected</p>
              <p class="text-sm text-gray-700">
                Executing this transaction will invalidate the others
              </p>
            </div>
          </div>
        </div>

        <!-- Explanation -->
        <div class="text-sm text-gray-600 space-y-2">
          <p>
            <span class="font-semibold">Why this happens:</span>
            Safe transactions must follow nonce order. This execution invalidates earlier nonces.
          </p>
        </div>
      </div>

      <hr />

      <!-- Action Buttons -->
      <div class="flex gap-3 justify-end">
        <ButtonUI variant="secondary" @click="handleCancel" data-test="cancel-execute-button">
          Cancel
        </ButtonUI>
        <ButtonUI
          variant="warning"
          @click="handleConfirm"
          :loading="isExecuting"
          data-test="confirm-execute-button"
        >
          Execute Anyway
        </ButtonUI>
      </div>
    </div>
  </ModalComponent>
</template>

<script setup lang="ts">
import ModalComponent from '@/components/ModalComponent.vue'
import ButtonUI from '@/components/ButtonUI.vue'
import { Icon as IconifyIcon } from '@iconify/vue'

interface Props {
  isExecuting?: boolean
}

withDefaults(defineProps<Props>(), {
  isExecuting: false
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
