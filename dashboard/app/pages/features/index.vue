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

      <!-- Features Table Section -->
      <div>
        <!-- Loading State -->
        <div v-if="isLoading" class="space-y-4">
          <USkeleton class="h-12" />
          <USkeleton class="h-64" />
        </div>

        <!-- Features Table -->
        <UTable
          v-else-if="features && features.length > 0"
          :data="features"
          :columns="columns"
          class="flex-1"
        />

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
              @click="isCreateModalOpen = true"
            >
              Create Your First Feature
            </UButton>
          </div>
        </UCard>
      </div>
    </div>

    <!-- Create Feature Modal Component -->
    <CreateFeatureModal
      v-model:open="isCreateModalOpen"
      :existing-features="features"
    />

    <!-- Delete Feature Modal Component -->
    <DeleteFeatureModal
      v-model:open="isDeleteModalOpen"
      :feature="featureToDelete"
    />
  </UPageCard>
</template>

<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type { Feature, FeatureStatus } from '~/types'
import { useFeaturesQuery, useUpdateFeatureQuery } from '~/queries/feature.query'

const USelect = resolveComponent('USelect')
const UButton = resolveComponent('UButton')

// Feature data
const { data: features, isLoading, error } = useFeaturesQuery()

// Mutations
const { mutateAsync: updateFeature, isPending: isUpdatingFeature } = useUpdateFeatureQuery()

// Modal states
const isCreateModalOpen = ref(false)
const isDeleteModalOpen = ref(false)
const featureToDelete = ref<Feature | null>(null)

// Status options for the select dropdown
const statusOptions = [
  { label: 'Enabled', value: 'enabled' },
  { label: 'Disabled', value: 'disabled' },
  { label: 'Beta', value: 'beta' }
]

// Utility methods
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

// Table columns configuration
const columns: TableColumn<Feature>[] = [
  {
    accessorKey: 'functionName',
    header: 'Function Name',
    cell: ({ row }) => {
      const functionName = row.getValue('functionName') as string
      return h('span', {
        class: 'font-medium text-gray-900 dark:text-white',
        title: functionName
      }, functionName)
    }
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const feature = row.original
      return h(USelect, {
        'modelValue': feature.status,
        'items': statusOptions,
        'valueKey': 'value',
        'size': 'sm',
        'class': 'w-32',
        'disabled': isUpdatingFeature.value,
        'loading': isUpdatingFeature.value,
        'data-test': 'status-select',
        'onUpdate:modelValue': (value: FeatureStatus) => {
          handleUpdateStatus(feature, value)
        }
      })
    }
  },
  {
    accessorKey: 'createdAt',
    header: 'Created',
    cell: ({ row }) => {
      return h('span', {
        class: 'text-xs text-gray-500 dark:text-gray-500'
      }, formatDate(row.getValue('createdAt') as string))
    }
  },
  {
    accessorKey: 'updatedAt',
    header: 'Updated',
    cell: ({ row }) => {
      return h('span', {
        class: 'text-xs text-gray-500 dark:text-gray-500'
      }, formatDate(row.getValue('updatedAt') as string))
    }
  },
  {
    accessorKey: 'actions',
    header: 'Actions',
    meta: {
      class: {
        th: 'text-right'
      }
    },
    cell: ({ row }) => {
      const feature = row.original
      return h('div', { class: 'flex items-center justify-end gap-2' }, [
        // View Button
        h(UButton, {
          'to': `/features/${feature.functionName}`,
          'icon': 'i-lucide-eye',
          'color': 'primary',
          'variant': 'ghost',
          'size': 'sm',
          'data-test': 'view-feature-btn',
          'aria-label': 'View feature details'
        }, () => 'View'),
        // Delete Button
        h(UButton, {
          'icon': 'i-lucide-trash-2',
          'color': 'error',
          'variant': 'ghost',
          'size': 'sm',
          'data-test': 'delete-feature-btn',
          'onClick': () => openDeleteModal(feature)
        })
      ])
    }
  }
]

// Delete Modal Handler
const openDeleteModal = (feature: Feature) => {
  featureToDelete.value = feature
  isDeleteModalOpen.value = true
}

// Update Feature Status Handler
const handleUpdateStatus = async (feature: Feature, newStatus: FeatureStatus) => {
  // Don't update if status is the same
  if (feature.status === newStatus) return

  await updateFeature({
    functionName: feature.functionName,
    status: newStatus
  })
}
</script>
