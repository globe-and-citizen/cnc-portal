<template>
  <UPageCard>
    <div class="w-full mb-6">
      <div class="flex items-start justify-between">
        <div>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
            Feature Management
          </h3>
          <p class="text-sm text-gray-600 dark:text-gray-400">
            Configure and manage application features
          </p>
        </div>
        <UButton
          icon="i-lucide-plus"
          color="primary"
          data-test="create-feature-btn"
          @click="isCreateModalOpen = true"
        >
          Create Feature
        </UButton>
      </div>
    </div>

    <div class="space-y-6">
      <!-- Info Alert -->
      <UAlert
        color="info"
        variant="soft"
        icon="i-lucide-info"
        title="About Features"
        description="Features can be enabled, disabled, or set to beta. Managing features helps control application functionality across teams."
      />

      <!-- Error Alert -->
      <UAlert
        v-if="error"
        color="error"
        variant="soft"
        icon="i-lucide-alert-circle"
        title="Failed to load features"
        :description="error.message || 'An unexpected error occurred'"
      />

      <!-- Features Table Component -->
      <FeaturesTable
        :features="features"
        :loading="isLoading"
        :deleting-feature="deletingFeature"
        :updating-feature="updatingFeature"
        @create="isCreateModalOpen = true"
        @delete="openDeleteModal"
        @update-status="handleUpdateStatus"
      />
    </div>

    <!-- Create Feature Modal Component -->
    <CreateFeatureModal
      v-model:open="isCreateModalOpen"
      :loading="isCreating"
      :existing-features="features"
      @submit="handleCreateFeature"
    />

    <!-- Delete Feature Modal Component -->
    <DeleteFeatureModal
      v-model:open="isDeleteModalOpen"
      :feature="featureToDelete"
      :loading="isDeleting"
      @confirm="handleDeleteFeature"
    />
  </UPageCard>
</template>

<script setup lang="ts">
import type { Feature, FeatureStatus } from '~/types'
import { useFeatures, useCreateFeature, useDeleteFeature, useUpdateFeature } from '~/queries/feature.query'
import FeaturesTable from '~/components/features/FeaturesTable.vue'
import CreateFeatureModal from '~/components/features/CreateFeatureModal.vue'
import DeleteFeatureModal from '~/components/features/DeleteFeatureModal.vue'

// Feature data
const { data: features, isLoading, error } = useFeatures()
// const features = computed(() => data.value?.data || [])

// Mutations
const createFeatureMutation = useCreateFeature()
const deleteFeatureMutation = useDeleteFeature()
const updateFeatureMutation = useUpdateFeature()

// Modal states
const isCreateModalOpen = ref(false)
const isDeleteModalOpen = ref(false)
const featureToDelete = ref<Feature | null>(null)
const deletingFeature = ref<string | null>(null)
const updatingFeature = ref<string | null>(null)

// Computed
const isCreating = computed(() => createFeatureMutation.isPending.value)
const isDeleting = computed(() => deleteFeatureMutation.isPending.value)

// Create Feature Handler
const handleCreateFeature = async (formData: { functionName: string, status: FeatureStatus }) => {
  try {
    await createFeatureMutation.mutateAsync(formData)
    isCreateModalOpen.value = false
  } catch (error) {
    console.error('Failed to create feature:', error)
  }
}

// Delete Feature Handlers
const openDeleteModal = (feature: Feature) => {
  featureToDelete.value = feature
  isDeleteModalOpen.value = true
}

const handleDeleteFeature = async () => {
  if (!featureToDelete.value) return

  try {
    deletingFeature.value = featureToDelete.value.functionName
    await deleteFeatureMutation.mutateAsync(featureToDelete.value.functionName)
    isDeleteModalOpen.value = false
    featureToDelete.value = null
  } catch (error) {
    console.error('Failed to delete feature:', error)
  } finally {
    deletingFeature.value = null
  }
}

// Update Feature Status Handler
const handleUpdateStatus = async (feature: Feature, newStatus: FeatureStatus) => {
  // Don't update if status is the same
  if (feature.status === newStatus) return

  try {
    updatingFeature.value = feature.functionName
    await updateFeatureMutation.mutateAsync({
      functionName: feature.functionName,
      status: newStatus
    })
  } catch (error) {
    console.error('Failed to update feature status:', error)
  } finally {
    updatingFeature.value = null
  }
}
</script>
