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

    <!-- Table -->
    <UTable
      v-else
      :data="teams"
      :columns="columns"
      :loading="loading"
    />

    <!-- Pagination directly below the table -->
    <div v-if="total > 0" class="flex justify-between items-center pt-4 gap-4">
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
import { h, computed } from 'vue'
import type { ColumnDef } from '@tanstack/vue-table'
import { UBadge, USwitch, UButton } from '#components'

// Props
interface TeamRestrictionOverride {
  teamId: number
  teamName: string
  isRestricted: boolean
  memberCount?: number
  updatedAt?: string
}

interface Props {
  teams: TeamRestrictionOverride[]
  loading?: boolean
  loadingTeamId?: number | null
  globalRestrictionEnabled: boolean
  total: number
  currentPage: number
  pageSize: number
  isEditable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  loadingTeamId: null,
  isEditable: true
})

// Emits
const emit = defineEmits<{
  'toggle-restriction': [team: TeamRestrictionOverride, value: boolean]
  'remove-override': [team: TeamRestrictionOverride]
  'page-change': [page: number]
  'page-size-change': [size: number]
}>()

// Page size options
const pageSizeOptions = [
  { label: '10 per page', value: 10 },
  { label: '15 per page', value: 15 },
  { label: '20 per page', value: 20 }
]

// Table columns definition
const columns = computed<ColumnDef<TeamRestrictionOverride>[]>(() => [
  {
    id: 'team',
    accessorKey: 'teamName',
    header: 'Team',
    cell: ({ row }) => {
      return h('div', { class: 'flex flex-col' }, [
        h('span', { class: 'font-medium text-highlighted' }, row.original.teamName),
        row.original.memberCount
          ? h(
              'span',
              { class: 'text-xs text-muted' },
              `${row.original.memberCount} ${row.original.memberCount === 1 ? 'member' : 'members'}`
            )
          : null
      ])
    }
  },
  {
    id: 'status',
    accessorKey: 'isRestricted',
    header: 'Status',
    cell: ({ row }) => {
      return h(
        UBadge,
        {
          color: row.original.isRestricted ? 'error' : 'success',
          variant: 'soft'
        },
        () => (row.original.isRestricted ? 'Restricted' : 'Unrestricted')
      )
    }
  },
  {
    id: 'toggle',
    header: 'Restriction',
    cell: ({ row }) => {
      return h('div', { class: 'flex items-center gap-2' }, [
        h(USwitch, {
          'modelValue': row.original.isRestricted,
          'data-test': 'team-restriction-switch',
          'disabled': !props.isEditable,
          'loading': props.loadingTeamId === row.original.teamId,
          'onUpdate:modelValue': (value: boolean) => emit('toggle-restriction', row.original, value)
        }),
        h('span', { class: 'text-sm text-muted' }, row.original.isRestricted ? 'ON' : 'OFF')
      ])
    }
  },
  {
    id: 'action',
    header: 'Action',
    cell: ({ row }) => {
      return h(
        UButton,
        {
          'color': 'error',
          'variant': 'ghost',
          'size': 'xs',
          'data-test': 'remove-override-btn',
          'icon': 'i-lucide-trash-2',
          'disabled': !props.isEditable,
          'loading': props.loadingTeamId === row.original.teamId,
          'onClick': () => emit('remove-override', row.original)
        },
        () => 'Remove'
      )
    }
  }
])

// Handlers
const handlePageChange = (page: number) => {
  emit('page-change', page)
}

const handlePageSizeChange = (size: number) => {
  emit('page-size-change', size)
}
</script>
