<template>
  <div class="space-y-6">
    <!-- Add Override Button Header -->
    <div class="flex items-center justify-between">
      <div>
        <h4 class="font-semibold text-highlighted">
          Team Overrides
        </h4>
        <p class="text-sm text-muted">
          Teams with custom restriction settings ({{ feature.teamFunctionOverrides.length }} overrides)
        </p>
      </div>
      <FeaturesAddTeamOverrideModal
        :feature="feature"
      />
    </div>

    <!-- Team Overrides Table -->
    <UTable
      :data="feature.teamFunctionOverrides"
      :columns="columns"
      :empty="emptyState"
      class="w-full"
    >
      <template #team-cell="{ row }">
        <div class="flex items-center gap-2">
          <span class="font-medium text-highlighted">{{ row.original.team?.name || 'Unknown Team' }}</span>
        </div>
      </template>

      <template #status-cell="{ row }">
        <div>
          <USelect
            :model-value="row.original.status"
            :items="FEATURE_STATUS_OPTIONS"
            size="sm"
            class="w-32"
            @update:model-value="(value) => handleStatusChange(row.original, value as FeatureStatus)"
          />
        </div>
      </template>

      <template #actions-cell="{ row }">
        <FeaturesDeleteTeamOverrideModal :override="row.original" />
      </template>
    </UTable>
  </div>
</template>

<script setup lang="ts">
import type { Feature, TeamFunctionOverride, FeatureStatus } from '~/types'
import type { TableColumn } from '@nuxt/ui'
import { useUpdateFeatureTeamOverrideQuery } from '~/queries'
import { FEATURE_STATUS_OPTIONS } from '~/api/features'

const props = defineProps<{
  feature: Feature
}>()

const { mutate: updateTeamOverride } = useUpdateFeatureTeamOverrideQuery()

const columns: TableColumn<TeamFunctionOverride>[] = [
  {
    id: 'team',
    header: 'Team',
    accessorKey: 'team.name',
    meta: {
      class: {
        th: 'w-2/5'
      }
    }
  },
  {
    id: 'status',
    header: 'Status',
    accessorKey: 'status',
    meta: {
      class: {
        th: 'w-1/5'
      }
    }
  },
  {
    id: 'updatedAt',
    header: 'Last Updated',
    accessorKey: 'updatedAt',
    cell: ({ row }) => {
      return new Date(row.original.updatedAt).toLocaleString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    },
    meta: {
      class: {
        th: 'w-1/5'
      }
    }
  },
  {
    id: 'actions',
    header: '',
    meta: {
      class: {
        th: 'w-1/5 text-right',
        td: 'text-right'
      }
    }
  }
]

const emptyState = 'No team overrides configured. All teams use the global feature setting.'

function handleStatusChange(override: TeamFunctionOverride, newStatus: FeatureStatus) {
  updateTeamOverride({
    featureName: props.feature.functionName,
    teamId: override.teamId,
    status: newStatus
  })
}
</script>
