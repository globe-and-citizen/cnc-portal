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
          @click="openCreateModal"
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

      <!-- Loading State -->
      <div v-if="isLoading" class="space-y-4">
        <USkeleton class="h-12" />
        <USkeleton class="h-64" />
      </div>

      <!-- Features Table -->
      <div v-else-if="features && features.length > 0" class="overflow-x-auto">
        <table class="w-full border-collapse">
          <thead>
            <tr class="border-b-2 border-gray-200 dark:border-gray-700">
              <th class="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">
                Function Name
              </th>
              <th class="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">
                Status
              </th>
              <th class="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">
                Overrides
              </th>
              <th class="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">
                Created
              </th>
              <th class="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">
                Updated
              </th>
              <th class="text-right py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="feature in features"
              :key="feature.functionName"
              data-test="feature-row"
              class="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            >
              <td class="py-4 px-4">
                <span class="font-medium text-gray-900 dark:text-white" :title="feature.functionName">
                  {{ feature.functionName }}
                </span>
              </td>
              <td class="py-4 px-4">
                <UBadge
                  :color="getStatusColor(feature.status)"
                  variant="soft"
                  size="sm"
                >
                  {{ feature.status }}
                </UBadge>
              </td>
              <td class="py-4 px-4">
                <span class="text-sm  text-gray-600 dark:text-gray-400">
                  {{ feature.overridesCount }}
                </span>
              </td>
              <td class="py-4 px-4">
                <span class="text-xs text-gray-500 dark:text-gray-500">
                  {{ formatDate(feature.createdAt) }}
                </span>
              </td>
              <td class="py-4 px-4">
                <span class="text-xs text-gray-500 dark:text-gray-500">
                  {{ formatDate(feature.updatedAt) }}
                </span>
              </td>
              <td class="py-4 px-4">
                <div class="flex items-center justify-end gap-2">
                  <UButton
                    :to="{
                      path: '/features/submit-restriction',
                      query: { feature: feature.functionName }
                    }"
                    icon="i-lucide-eye"
                    color="primary"
                    variant="ghost"
                    size="sm"
                    data-test="view-feature-btn"
                    aria-label="View feature details"
                  >
                    View
                  </UButton>
                  <UButton
                    icon="i-lucide-trash-2"
                    color="error"
                    variant="ghost"
                    size="sm"
                    :loading="deletingFeature === feature.functionName"
                    :disabled="deletingFeature === feature.functionName"
                    data-test="delete-feature-btn"
                    @click="openDeleteModal(feature)"
                  />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Empty State -->
      <UCard v-else>
        <div class="text-center py-12">
          <div class="flex justify-center mb-4">
            <div class="p-4 bg-gray-100 dark:bg-gray-800 rounded-full">
              <Icon name="i-lucide-layers" class="w-8 h-8 text-gray-400" />
            </div>
          </div>
          <h3 class="text-lg font-semibold text-highlighted mb-2">
            No Features Yet
          </h3>
          <p class="text-sm text-muted mb-6">
            Get started by creating your first feature
          </p>
          <UButton
            icon="i-lucide-plus"
            color="primary"
            data-test="create-first-feature-btn"
            @click="openCreateModal"
          >
            Create Your First Feature
          </UButton>
        </div>
      </UCard>
    </div>

    <!-- Create Feature Modal -->
    <UModal v-model:open="isCreateModalOpen">
      <template #content>
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-semibold">
                Create New Feature
              </h3>
              <UButton
                icon="i-lucide-x"
                color="neutral"
                variant="ghost"
                size="sm"
                @click="closeCreateModal"
              />
            </div>
          </template>

          <form class="space-y-4" @submit.prevent="handleCreateFeature">
            <div>
              <label class="block text-sm font-medium mb-2">
                Function Name <span class="text-red-500">*</span>
              </label>
              <UInput
                v-model="createForm.functionName"
                placeholder="e.g., SubmitRestriction"
                data-test="function-name-input"
                :disabled="isCreating"
                icon="i-lucide-code"
                required
              />
              <p class="text-xs text-muted mt-1">
                Enter a unique function name (e.g., SubmitRestriction, ApprovalFlow)
              </p>
              <p v-if="createFormErrors.functionName" class="text-xs text-red-500 mt-1">
                {{ createFormErrors.functionName }}
              </p>
            </div>

            <div>
              <label class="block text-sm font-medium mb-2">
                Status <span class="text-red-500">*</span>
              </label>
              <USelect
                v-model="createForm.status"
                :items="statusOptions"
                value-key="value"
                data-test="status-select"
                :disabled="isCreating"
                icon="i-lucide-settings"
              />
              <p class="text-xs text-muted mt-1">
                Set the initial status for this feature
              </p>
            </div>

            <div class="flex items-center gap-3 pt-4">
              <UButton
                type="submit"
                color="primary"
                :loading="isCreating"
                :disabled="!isFormValid || isCreating"
                data-test="submit-create-btn"
                icon="i-lucide-check"
                class="flex-1"
              >
                Create Feature
              </UButton>
              <UButton
                type="button"
                color="neutral"
                variant="outline"
                :disabled="isCreating"
                @click="closeCreateModal"
              >
                Cancel
              </UButton>
            </div>
          </form>
        </UCard>
      </template>
    </UModal>

    <!-- Delete Confirmation Modal -->
    <UModal v-model:open="isDeleteModalOpen">
      <template #content>
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-semibold text-error-600">
                Confirm Deletion
              </h3>
              <UButton
                icon="i-lucide-x"
                color="neutral"
                variant="ghost"
                size="sm"
                @click="closeDeleteModal"
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
                    {{ featureToDelete?.functionName }}
                  </p>
                  <p class="text-sm">
                    This will also delete all
                    <span class="font-semibold">{{ featureToDelete?.overridesCount || 0 }}</span>
                    associated team override(s).
                  </p>
                </div>
              </template>
            </UAlert>

            <div class="flex items-center gap-3 pt-4">
              <UButton
                color="error"
                :loading="isDeleting"
                :disabled="isDeleting"
                data-test="confirm-delete-btn"
                icon="i-lucide-trash-2"
                class="flex-1"
                @click="handleDeleteFeature"
              >
                Delete Feature
              </UButton>
              <UButton
                color="neutral"
                variant="outline"
                :disabled="isDeleting"
                @click="closeDeleteModal"
              >
                Cancel
              </UButton>
            </div>
          </div>
        </UCard>
      </template>
    </UModal>
  </UPageCard>
</template>

<script setup lang="ts">
import type { Feature, FeatureStatus } from '~/types'
import { useFeatures, useCreateFeature, useDeleteFeature } from '~/queries/function.query'

// Feature data
const { data, isLoading, error } = useFeatures()
const features = computed(() => data.value?.data || [])

// Mutations
const createFeatureMutation = useCreateFeature()
const deleteFeatureMutation = useDeleteFeature()

// Create Feature Modal State
const isCreateModalOpen = ref(false)
const createForm = reactive({
  functionName: '',
  status: 'enabled' as FeatureStatus
})
const createFormErrors = reactive({
  functionName: ''
})

const isCreating = computed(() => createFeatureMutation.isPending.value)

// Delete Feature Modal State
const isDeleteModalOpen = ref(false)
const featureToDelete = ref<Feature | null>(null)
const deletingFeature = ref<string | null>(null)
const isDeleting = computed(() => deleteFeatureMutation.isPending.value)

// Status options for select
const statusOptions = [
  { label: 'Enabled', value: 'enabled' },
  { label: 'Disabled', value: 'disabled' },
  { label: 'Beta', value: 'beta' }
]

// Computed properties
const isFormValid = computed(() => {
  return createForm.functionName.trim().length > 0 && createForm.status
})

// Methods
const formatDate = (dateString?: string) => {
  if (!dateString) return '—'
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getStatusColor = (status: FeatureStatus): 'success' | 'error' | 'warning' | 'neutral' => {
  const colors: Record<FeatureStatus, 'success' | 'error' | 'warning'> = {
    enabled: 'success',
    disabled: 'error',
    beta: 'warning'
  }
  return colors[status] || 'neutral'
}

// Create Feature Methods
const openCreateModal = () => {
  isCreateModalOpen.value = true
  resetCreateForm()
}

const closeCreateModal = () => {
  isCreateModalOpen.value = false
  resetCreateForm()
}

const resetCreateForm = () => {
  createForm.functionName = ''
  createForm.status = 'enabled'
  createFormErrors.functionName = ''
}

const validateForm = () => {
  createFormErrors.functionName = ''

  if (!createForm.functionName.trim()) {
    createFormErrors.functionName = 'Function name is required'
    return false
  }

  if (createForm.functionName.length < 3) {
    createFormErrors.functionName = 'Function name must be at least 3 characters'
    return false
  }

  // Check if feature already exists
  if (features.value.some(f => f.functionName.toLowerCase() === createForm.functionName.toLowerCase())) {
    createFormErrors.functionName = 'A feature with this name already exists'
    return false
  }

  return true
}

const handleCreateFeature = async () => {
  if (!validateForm()) return

  try {
    await createFeatureMutation.mutateAsync({
      functionName: createForm.functionName.trim(),
      status: createForm.status
    })
    closeCreateModal()
  } catch (error) {
    console.error('Failed to create feature:', error)
  }
}

// Delete Feature Methods
const openDeleteModal = (feature: Feature) => {
  featureToDelete.value = feature
  isDeleteModalOpen.value = true
}

const closeDeleteModal = () => {
  isDeleteModalOpen.value = false
  featureToDelete.value = null
}

const handleDeleteFeature = async () => {
  if (!featureToDelete.value) return

  try {
    deletingFeature.value = featureToDelete.value.functionName
    await deleteFeatureMutation.mutateAsync(featureToDelete.value.functionName)
    closeDeleteModal()
  } catch (error) {
    console.error('Failed to delete feature:', error)
  } finally {
    deletingFeature.value = null
  }
}
</script>

<style scoped>
table {
  min-width: 100%;
}

tbody tr:last-child {
  border-bottom: none;
}
</style>
