<template>
  <UCard class="mb-6">
    <template #header>
      <h4 class="font-semibold text-highlighted">
        Global Setting
      </h4>
    </template>
    <div class="flex items-center justify-between">
      <div>
        <p class="font-medium">
          Enable Restriction Globally
        </p>
        <p class="text-sm text-muted">
          Configure the default restriction state for all teams
        </p>
      </div>
      <div class="flex items-center gap-3">
        <USelect
          v-model="internalStatus"
          :items="FEATURE_STATUS_OPTIONS"
          value-key="value"
          :disabled="isLoading || !isEditable"
          data-test="global-restriction-select"
          class="w-32"
          @update:model-value="handleStatusChange"
        />
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { FeatureStatus } from '~/types'
import { FEATURE_STATUS_OPTIONS } from '~/api/features'
import { useUpdateGlobalFeatureRestriction } from '~/queries'

// Props
interface Props {
  featureName: string
  modelValue: FeatureStatus
  isEditable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isEditable: true
})

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: FeatureStatus]
  'updated': []
}>()

// Query hooks
const { mutateAsync: updateGlobalRestriction } = useUpdateGlobalFeatureRestriction()

// State
const isLoading = ref(false)
const internalStatus = ref<FeatureStatus>(props.modelValue)

// Watch for external changes
watch(() => props.modelValue, (newValue) => {
  internalStatus.value = newValue
})

// Handlers
const handleStatusChange = async (value: FeatureStatus | undefined) => {
  if (!value || !props.isEditable) return

  isLoading.value = true
  const previousStatus = internalStatus.value

  try {
    await updateGlobalRestriction({
      featureName: props.featureName,
      status: value
    })

    internalStatus.value = value
    emit('update:modelValue', value)
    emit('updated')
  } catch (error) {
    console.error(`Error updating ${props.featureName} global restriction:`, error)
    // Revert to previous status on error
    internalStatus.value = previousStatus
  } finally {
    isLoading.value = false
  }
}
</script>
