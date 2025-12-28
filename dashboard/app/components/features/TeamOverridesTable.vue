<template>
  <UPageCard variant="subtle">
    <template #header>
      <div class="flex items-center justify-between">
        <div>
          <h4 class="font-semibold text-highlighted">
            Overridden Teams
          </h4>
          <p class="text-sm text-muted">
            Teams with custom restriction settings
          </p>
        </div>
      </div>
    </template>

    <!-- Empty state -->
    <div v-if="!loading && teams.length === 0" class="text-center py-8">
      <UIcon name="i-lucide-users" class="w-12 h-12 text-muted mx-auto mb-3" />
      <p class="text-muted">
        No team overrides configured
      </p>
      <p class="text-sm text-muted">
        Click "Add Override" to create custom settings for a team
      </p>
    </div>

    <!-- Teams Table -->
    <div v-else class="overflow-x-auto">
      <table class="w-full">
        <thead class="border-b border-gray-200 dark:border-gray-700">
          <tr>
            <th class="text-left py-3 px-4 font-semibold text-sm text-highlighted">
              Team
            </th>
            <th class="text-left py-3 px-4 font-semibold text-sm text-highlighted">
              Status
            </th>
            <th class="text-left py-3 px-4 font-semibold text-sm text-highlighted">
              Restriction
            </th>
            <th class="text-right py-3 px-4 font-semibold text-sm text-highlighted">
              Action
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="team in teams"
            :key="team.teamId"
            class="border-b border-gray-200 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
          >
            <!-- Team Column -->
            <td class="py-3 px-4">
              <p class="font-medium text-highlighted">
                {{ team.teamName }}
              </p>
            </td>

            <!-- Status Column -->
            <td class="py-3 px-4">
              <UBadge
                :color="statusColorsMap[team.status]"
                variant="soft"
              >
                {{ statusLabelsMap[team.status] }}
              </UBadge>
            </td>

            <!-- Restriction Column -->
            <td class="py-3 px-4">
              <USelect
                :model-value="team.status"
                :items="FEATURE_STATUS_OPTIONS"
                value-key="value"
                :disabled="loadingTeamId === team.teamId "
                class="w-40"
                data-test="team-status-select"
                @update:model-value="(value) => value && emit('toggle-restriction', team, value)"
              />
            </td>

            <!-- Action Column -->
            <td class="py-3 px-4 text-right">
              <UButton
                label="Remove"
                color="error"
                variant="ghost"
                size="sm"
                icon="i-lucide-trash-2"

                :loading="loadingTeamId === team.teamId"
                data-test="remove-override-btn"
                @click="emit('remove-override', team)"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div v-if="total > 0" class="flex justify-between items-center pt-4 gap-4 border-t border-gray-200 dark:border-gray-700 mt-4">
      <div class="flex items-center gap-3">
        <div class="text-sm text-muted">
          Showing {{ (currentPage - 1) * pageSize + 1 }} to
          {{ Math.min(currentPage * pageSize, total) }} of {{ total }} overrides
        </div>
        <USelect
          :model-value="pageSize"
          :items="pageSizeOptions"
          size="xs"
          class="w-32"
          @update:model-value="handlePageSizeChange"
        />
      </div>
      <UPagination
        :default-page="currentPage"
        :items-per-page="pageSize"
        :total="total"
        data-test="team-pagination"
        @update:page="handlePageChange"
      />
    </div>
  </UPageCard>
</template>

<script setup lang="ts">
import {
  FEATURE_STATUS_OPTIONS,
  type FeatureStatus,
  type TeamRestrictionOverride
} from '~/lib/axios'

// Props
interface Props {
  teams: TeamRestrictionOverride[]
  loading?: boolean
  loadingTeamId?: number | null
  globalRestrictionEnabled: boolean
  total: number
  currentPage: number
  pageSize: number
}

withDefaults(defineProps<Props>(), {
  loading: false,
  loadingTeamId: null
})

// Emits
const emit = defineEmits<{
  'toggle-restriction': [team: TeamRestrictionOverride, value: FeatureStatus]
  'remove-override': [team: TeamRestrictionOverride]
  'page-change': [page: number]
  'page-size-change': [size: number]
}>()

// Status color and label mappings
const statusColorsMap = {
  enabled: 'success',
  disabled: 'error',
  beta: 'warning'
} as const

const statusLabelsMap = {
  enabled: 'Enabled',
  disabled: 'Disabled',
  beta: 'Beta'
} as const

// Page size options
const pageSizeOptions = [
  { label: '10 per page', value: 10 },
  { label: '15 per page', value: 15 },
  { label: '20 per page', value: 20 }
]

// Handlers
const handlePageChange = (page: number) => {
  emit('page-change', page)
}

const handlePageSizeChange = (size: number) => {
  emit('page-size-change', size)
}
</script>
