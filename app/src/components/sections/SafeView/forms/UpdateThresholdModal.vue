<template>
  <UModal v-model:open="isOpen" :close="{ onClick: () => handleClose() }" title="Update Threshold">
    <template #body>
      <UForm
        :schema="thresholdSchema"
        :state="formState"
        class="space-y-6"
        @submit="handleUpdateThreshold"
      >
        <!-- Current Configuration -->
        <UAlert
          color="neutral"
          variant="soft"
          title="Current Configuration"
          :ui="{ description: 'space-y-2' }"
        >
          <template #description>
            <div class="flex items-center gap-2 text-sm">
              <IconifyIcon icon="heroicons:users" class="w-4 h-4 text-blue-600" />
              <span>{{ currentOwners.length }} signers</span>
            </div>
            <div class="flex items-center gap-2 text-sm">
              <IconifyIcon icon="heroicons:shield-check" class="w-4 h-4 text-green-600" />
              <span>{{ currentThreshold }} of {{ currentOwners.length }} required</span>
            </div>
          </template>
        </UAlert>

        <!-- Threshold Input -->
        <UFormField
          name="threshold"
          label="New Threshold"
          :description="`Select number of signers (1-${currentOwners.length}) required to execute transactions`"
          required
        >
          <UInput
            v-model.number="formState.threshold"
            type="number"
            :min="1"
            :max="currentOwners.length"
            placeholder="Enter threshold"
            data-test="threshold-input"
          />
        </UFormField>

        <!-- Summary -->
        <UAlert
          v-if="hasChanges"
          color="primary"
          variant="soft"
          title="Summary"
          :ui="{ description: 'space-y-2' }"
        >
          <template #description>
            <div class="flex items-center gap-2 text-sm">
              <IconifyIcon icon="heroicons:arrow-right" class="w-4 h-4 text-green-600" />
              <span
                >Updating threshold from {{ currentThreshold }} to {{ formState.threshold }}</span
              >
            </div>
            <div class="flex items-center gap-2 text-sm">
              <IconifyIcon icon="heroicons:shield-check" class="w-4 h-4 text-blue-600" />
              <span
                >{{ formState.threshold }} of {{ currentOwners.length }} signatures will be
                required</span
              >
            </div>
          </template>
        </UAlert>

        <!-- Action Buttons -->
        <div class="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
          <UButton
            color="neutral"
            variant="outline"
            :disabled="isLoading"
            @click="handleClose"
            data-test="cancel-button"
          >
            Cancel
          </UButton>
          <UButton
            type="submit"
            color="primary"
            :loading="isLoading"
            :disabled="!hasChanges || isLoading"
            data-test="update-threshold-button"
          >
            <template #leading>
              <IconifyIcon v-if="!isLoading" icon="heroicons:shield-check" class="w-4 h-4" />
            </template>
            Update Threshold
          </UButton>
        </div>
      </UForm>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { z } from 'zod'
import { type Address } from 'viem'
import { Icon as IconifyIcon } from '@iconify/vue'

import { useSafeOwnerManagement } from '@/composables/safe'
import { useToastStore } from '@/stores'

const props = defineProps<{
  open: boolean
  safeAddress: Address
  currentOwners: string[]
  currentThreshold: number
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'threshold-updated': []
}>()

const { addSuccessToast, addErrorToast } = useToastStore()

const { isUpdating, updateOwners } = useSafeOwnerManagement()

// Computed values

// Zod validation schema
const thresholdSchema = computed(() =>
  z.object({
    threshold: z
      .number({ message: 'Threshold must be a number' })
      .int('Threshold must be a whole number')
      .min(1, 'Threshold must be at least 1')
      .max(props.currentOwners.length, `Threshold cannot exceed ${props.currentOwners.length}`)
  })
)

// Form state
const formState = reactive({
  threshold: props.currentThreshold
})

// Watch for prop changes
watch(
  () => props.currentThreshold,
  (newThreshold) => {
    formState.threshold = newThreshold
  }
)

watch(
  () => props.open,
  (newOpen) => {
    if (!newOpen) {
      formState.threshold = props.currentThreshold
    }
  }
)

// Computed properties
const isOpen = computed({
  get: () => props.open,
  set: (value) => emit('update:open', value)
})

const isLoading = computed(() => isUpdating.value)
const hasChanges = computed(() => formState.threshold !== props.currentThreshold)

// Methods
const handleUpdateThreshold = async () => {
  if (!hasChanges.value) {
    addErrorToast('No changes to apply')
    return
  }

  try {
    const txHash = await updateOwners(props.safeAddress, {
      newThreshold: formState.threshold,
      shouldPropose: props.currentThreshold >= 2
    })

    if (txHash) {
      addSuccessToast(
        props.currentThreshold >= 2
          ? 'Threshold update proposal submitted successfully'
          : 'Threshold updated successfully'
      )
      emit('threshold-updated')
      handleClose()
    }
  } catch (error) {
    console.error('Failed to update threshold:', error)
    addErrorToast('Failed to update threshold')
  }
}

const handleClose = () => {
  formState.threshold = props.currentThreshold
  emit('update:open', false)
}
</script>
