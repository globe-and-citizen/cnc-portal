<template>
  <UModal v-model:open="isOpen">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold text-error-400">
              Confirm Deletion
            </h3>
            <UButton
              icon="i-lucide-x"
              color="neutral"
              variant="ghost"
              size="sm"
              @click="handleClose"
            />
          </div>
        </template>

        <div class="space-y-4">
          <UAlert
            color="error"
            variant="soft"
            icon="i-lucide-alert-triangle"
            title="Warning: This action cannot be undone"
          >
            <template #description>
              <div class="space-y-2">
                <p>You are about to delete the feature:</p>
                <p class="font-semibold">
                  {{ feature?.functionName }}
                </p>
              </div>
            </template>
          </UAlert>

          <div class="flex items-center gap-3 pt-4 justify-between">
            <UButton
              color="neutral"
              variant="outline"
              :disabled="loading"
              @click="handleClose"
            >
              Cancel
            </UButton>
            <UButton
              color="error"
              :loading="loading"
              :disabled="loading"
              data-test="confirm-delete-btn"
              icon="i-lucide-trash-2"
              @click="handleConfirm"
            >
              Delete Feature
            </UButton>
          </div>
        </div>
      </UCard>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { Feature } from '~/types'
import { useDeleteFeatureQuery } from '~/queries/feature.query'

// Props
interface Props {
  open: boolean
  feature: Feature | null
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

// Mutations
const { mutateAsync: deleteFeature, isPending: loading } = useDeleteFeatureQuery()

// Computed
const isOpen = computed({
  get: () => props.open,
  set: value => emit('update:open', value)
})

// Methods
const handleConfirm = async () => {
  if (!props.feature) return

  await deleteFeature(props.feature.functionName)
  handleClose()
}

const handleClose = () => {
  emit('update:open', false)
}
</script>
