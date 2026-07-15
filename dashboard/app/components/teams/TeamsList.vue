<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { Column } from '@tanstack/table-core'
import { getPaginationRowModel } from '@tanstack/table-core'
import type { Address } from 'viem'
import type { Team } from '~/types'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import UserIdentity from '~/components/UserIdentity.vue'
import TeamOfficersCell from '~/components/teams/TeamOfficersCell.vue'

dayjs.extend(relativeTime)

const UButton = resolveComponent('UButton')

const props = defineProps<{
  teams: Team[]
  isLoading?: boolean
}>()

const table = useTemplateRef('table')

const columnFilters = ref([
  {
    id: 'name',
    value: ''
  }
])
const columnVisibility = ref()

// Reusable sortable header: renders a ghost button whose icon reflects the
// current sort direction and toggles asc/desc on click. Applied to every column.
const sortableHeader = (label: string) => ({ column }: { column: Column<Team> }) => {
  const isSorted = column.getIsSorted()

  return h(UButton, {
    color: 'neutral',
    variant: 'ghost',
    label,
    icon: isSorted
      ? isSorted === 'asc'
        ? 'i-lucide-arrow-up-narrow-wide'
        : 'i-lucide-arrow-down-wide-narrow'
      : 'i-lucide-arrow-up-down',
    class: '-mx-2.5',
    onClick: () => column.toggleSorting(column.getIsSorted() === 'asc')
  })
}

// Column definitions stay minimal — just the accessor + a sortable header.
// All cell rendering lives in the `#<column>-cell` template slots below, so the
// per-column customization is readable directly in the template.
const columns: TableColumn<Team>[] = [
  { accessorKey: 'id', header: sortableHeader('ID') },
  { accessorKey: 'name', header: sortableHeader('Name') },
  {
    id: 'members',
    accessorFn: row => row._count?.members || 0,
    header: sortableHeader('Members')
  },
  { accessorKey: 'ownerAddress', header: sortableHeader('Owner') },
  {
    id: 'officerVersion',
    accessorFn: row => row.currentOfficer?.version ?? null,
    header: sortableHeader('Version')
  },
  // Display-only column (no accessor → not sortable): the full Officer chain,
  // fetched per-team via GET /contract/officers by TeamOfficersCell. Given a
  // wide fixed width since it holds the richest per-row content.
  {
    id: 'officerHistory',
    header: 'Officer history'
  },
  { accessorKey: 'createdAt', header: sortableHeader('Created') }
]

// Route-bound page + size (shareable, reload-safe) with resize anchoring —
// shared with the accounting tables via usePagination. The TanStack table stays
// in charge of filtering/sorting; we just drive its (controlled) pagination
// state from the composable and mirror its internal updates back.
const filteredTotal = (): number =>
  table.value?.tableApi?.getFilteredRowModel().rows.length ?? 0

const { page, pageSize } = usePagination(filteredTotal, { key: 'teams' })

const pagination = computed({
  get: () => ({ pageIndex: page.value - 1, pageSize: pageSize.value }),
  set: ({ pageIndex, pageSize: size }: { pageIndex: number, pageSize: number }) => {
    if (pageIndex + 1 !== page.value) page.value = pageIndex + 1
    if (size !== pageSize.value) pageSize.value = size
  }
})
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-1.5">
      <UInput
        :model-value="table?.tableApi?.getColumn('name')?.getFilterValue() as string"
        class="max-w-sm"
        icon="i-lucide-search"
        placeholder="Filter by team name..."
        @update:model-value="table?.tableApi?.getColumn('name')?.setFilterValue($event)"
      />

      <div class="flex items-center gap-2 text-sm text-muted">
        <UIcon name="i-lucide-info" class="size-4" />
        <span>{{ props.teams.length }} team{{ props.teams.length !== 1 ? 's' : '' }} total</span>
      </div>
    </div>

    <UTable
      ref="table"
      v-model:column-filters="columnFilters"
      v-model:column-visibility="columnVisibility"
      v-model:pagination="pagination"
      :pagination-options="{
        getPaginationRowModel: getPaginationRowModel()
      }"
      class="shrink-0"
      :data="teams"
      :columns="columns"
      :loading="isLoading"
      :ui="{
        base: 'table-fixed border-separate border-spacing-0',
        thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
        tbody: '[&>tr]:last:[&>td]:border-b-0',
        th: 'py-2 first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r',
        td: 'border-b border-default',
        separator: 'h-0'
      }"
    >
      <template #id-cell="{ row }">
        #{{ row.original.id }}
      </template>

      <template #name-cell="{ row }">
        <div class="flex flex-col">
          <p class="font-medium text-highlighted">
            {{ row.original.name }}
          </p>
          <p
            v-if="row.original.description"
            class="text-sm text-muted truncate max-w-xs"
          >
            {{ row.original.description }}
          </p>
        </div>
      </template>

      <template #members-cell="{ row }">
        <UBadge color="neutral" variant="subtle">
          {{ row.original._count?.members || 0 }}
          member{{ (row.original._count?.members || 0) !== 1 ? 's' : '' }}
        </UBadge>
      </template>

      <template #ownerAddress-cell="{ row }">
        <UserIdentity :address="row.original.ownerAddress as Address" />
      </template>

      <template #officerVersion-cell="{ row }">
        <UBadge
          v-if="row.original.currentOfficer?.version"
          color="neutral"
          variant="subtle"
        >
          {{ row.original.currentOfficer.version }}
        </UBadge>
        <span v-else class="text-sm text-muted">—</span>
      </template>

      <template #officerHistory-cell="{ row }">
        <TeamOfficersCell :team-id="row.original.id" />
      </template>

      <template #createdAt-cell="{ row }">
        <div class="flex flex-col">
          <p class="text-sm">
            {{ dayjs(row.original.createdAt).fromNow() }}
          </p>
          <p class="text-xs text-muted">
            {{ dayjs(row.original.createdAt).format('MMM D, YYYY') }}
          </p>
        </div>
      </template>
    </UTable>

    <AccountingPagination
      v-model:page="page"
      v-model:page-size="pageSize"
      :total="table?.tableApi?.getFilteredRowModel().rows.length ?? 0"
      noun="teams"
    />
  </div>
</template>
