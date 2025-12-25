<template>
  <div>
    <!-- Loading State -->
    <div v-if="loading" class="space-y-4">
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
              <span class="text-sm text-gray-600 dark:text-gray-400">
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
                  @click="$emit('delete', feature)"
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
          @click="$emit('create')"
        >
          Create Your First Feature
        </UButton>
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { Feature, FeatureStatus } from '~/types'

// Props
interface Props {
  features: Feature[]
  loading?: boolean
  deletingFeature?: string | null
}

withDefaults(defineProps<Props>(), {
  loading: false,
  deletingFeature: null
})

// Emits
defineEmits<{
  delete: [feature: Feature]
  create: []
}>()

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

const getStatusColor = (status: FeatureStatus): 'success' | 'error' | 'warning' | 'neutral' => {
  const colors: Record<FeatureStatus, 'success' | 'error' | 'warning'> = {
    enabled: 'success',
    disabled: 'error',
    beta: 'warning'
  }
  return colors[status] || 'neutral'
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
