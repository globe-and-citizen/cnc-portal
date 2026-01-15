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
          :disabled="isPending"
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
import type { Feature, FeatureStatus } from '~/types'
import { FEATURE_STATUS_OPTIONS } from '~/api/features'
import { useUpdateFeatureQuery } from '~/queries'

const props = defineProps<{
  feature: Feature
}>()

// Query hooks
const { mutateAsync: updateFeatureMutation, isPending } = useUpdateFeatureQuery()

// State
const internalStatus = ref<FeatureStatus>(props.feature.status)

// Watch for external changes
watch(() => props.feature.status, (newValue) => {
  internalStatus.value = newValue
})

// Handlers
const handleStatusChange = async (value: FeatureStatus | undefined) => {
  if (!value) return

  await updateFeatureMutation({
    functionName: props.feature.functionName,
    status: value
  })
}
</script>
