<script setup lang="ts">
import type { RecentActivity } from '~/types'

defineProps<{
  data: RecentActivity | null | undefined
  isLoading: boolean
}>()

const getActivityIcon = (type: string) => {
  switch (type) {
    case 'claim': return 'i-lucide-file-text'
    case 'expense': return 'i-lucide-receipt'
    case 'action': return 'i-lucide-zap'
    case 'contract': return 'i-lucide-file-signature'
    default: return 'i-lucide-circle'
  }
}

const formatTimestamp = (timestamp: string) => {
  const date = new Date(timestamp)
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>

<template>
  <UPageCard title="Recent Activity" variant="subtle">
    <template v-if="isLoading">
      <div class="space-y-3">
        <USkeleton v-for="i in 5" :key="i" class="h-16 w-full" />
      </div>
    </template>
    <template v-else-if="data && data.activities.length > 0">
      <div class="space-y-3">
        <div
          v-for="(activity, index) in data.activities"
          :key="index"
          class="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
        >
          <div class="shrink-0">
            <div class="p-2 rounded-full bg-primary/10">
              <UIcon :name="getActivityIcon(activity.type)" class="size-4 text-primary" />
            </div>
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-start justify-between gap-2">
              <div class="flex-1">
                <p class="text-sm font-medium text-highlighted truncate">
                  {{ activity.description }}
                </p>
                <p class="text-xs text-muted mt-1">
                  Team: {{ activity.team.name }}
                </p>
              </div>
              <div class="text-xs text-muted whitespace-nowrap">
                {{ formatTimestamp(activity.createdAt) }}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div v-if="data.total > data.activities.length" class="mt-4 pt-4 border-t border-muted/20">
        <p class="text-sm text-muted text-center">
          Showing {{ data.activities.length }} of {{ data.total }} activities
        </p>
      </div>
    </template>
    <template v-else>
      <div class="text-center py-8">
        <UIcon name="i-lucide-activity" class="size-12 text-muted/50 mx-auto mb-2" />
        <p class="text-sm text-muted">
          No recent activity
        </p>
      </div>
    </template>
  </UPageCard>
</template>
