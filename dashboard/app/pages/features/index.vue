<template>
  <UPageCard>
    <template #header>
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-lg font-semibold text-highlighted">
            Available Features
          </h3>
          <p class="text-sm text-muted">
            List of configurable functions
          </p>
        </div>
      </div>
    </template>

    <div class="space-y-4">
      <UAlert
        v-if="error"
        color="error"
        variant="soft"
        title="Failed to load features"
        :description="error.message || 'An unexpected error occurred'"
      />

      <USkeleton v-if="isLoading" class="h-24" />

      <UCard v-else>
        <template #header>
          <div class="flex items-center justify-between">
            <h4 class="font-semibold text-highlighted">
              Features
            </h4>
            <span class="text-sm text-muted">Total: {{ features?.length || 0 }}</span>
          </div>
        </template>

        <div class="overflow-x-auto">
          <table class="min-w-full text-sm">
            <thead>
              <tr>
                <th class="text-left">
                  Function
                </th>
                <th class="text-left">
                  Status
                </th>
                <th class="text-left">
                  Overrides
                </th>
                <th class="text-left">
                  Created
                </th>
                <th class="text-left">
                  Updated
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="f in features" :key="f.functionName">
                <td class="py-2">
                  {{ f.functionName }}
                </td>
                <td class="py-2">
                  {{ f.status }}
                </td>
                <td class="py-2">
                  {{ f.overridesCount }}
                </td>
                <td class="py-2">
                  {{ formatDate(f.createdAt) }}
                </td>
                <td class="py-2">
                  {{ formatDate(f.updatedAt) }}
                </td>
              </tr>
              <tr v-if="!features || features.length === 0">
                <td colspan="5" class="text-center text-muted py-4">
                  No features found
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </UCard>
    </div>
  </UPageCard>
</template>

<script setup lang="ts">
import { useFeatures } from '~/queries/function.query'

const { data, isLoading, error } = useFeatures()
const features = computed(() => data.value?.data || [])

const formatDate = (v?: string) => {
  if (!v) return '—'
  const d = new Date(v)
  return d.toLocaleString()
}
</script>

<style scoped>
table { border-collapse: collapse; width: 100%; }
th, td { padding: 8px 12px; border-bottom: 1px solid #e5e7eb; }
.text-muted { color: #6b7280 }
</style>
