<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { Column } from '@tanstack/table-core'
import { getPaginationRowModel } from '@tanstack/table-core'
import type { Address } from 'viem'
import type { Team } from '~/types'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import UserIdentity from '~/components/UserIdentity.vue'

dayjs.extend(relativeTime)

const UButton = resolveComponent('UButton')
const UBadge = resolveComponent('UBadge')

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

const columns: TableColumn<Team>[] = [
  {
    accessorKey: 'id',
    header: sortableHeader('ID'),
    cell: ({ row }) => `#${row.original.id}`
  },
  {
    accessorKey: 'name',
    header: sortableHeader('Name'),
    cell: ({ row }) => {
      return h('div', { class: 'flex flex-col' }, [
        h('p', { class: 'font-medium text-highlighted' }, row.original.name),
        row.original.description
          ? h('p', { class: 'text-sm text-muted truncate max-w-xs' }, row.original.description)
          : null
      ])
    }
  },
  {
    id: 'members',
    accessorFn: row => row._count?.members || 0,
    header: sortableHeader('Members'),
    cell: ({ row }) => {
      const count = row.original._count?.members || 0
      return h(
        UBadge,
        {
          color: 'neutral',
          variant: 'subtle'
        },
        () => `${count} member${count !== 1 ? 's' : ''}`
      )
    }
  },
  {
    accessorKey: 'ownerAddress',
    header: sortableHeader('Owner'),
    cell: ({ row }) =>
      h(UserIdentity, { address: row.original.ownerAddress as Address })
  },
  {
    id: 'currentOfficer',
    accessorFn: row => row.currentOfficer?.address ?? '',
    header: sortableHeader('Officer'),
    cell: ({ row }) => {
      const address = row.original.currentOfficer?.address
      if (!address) {
        return h(UBadge, { color: 'warning', variant: 'subtle' }, () => 'Not Set')
      }
      return h(
        'a',
        {
          href: `https://polygonscan.com/address/${address}`,
          target: '_blank',
          rel: 'noopener noreferrer',
          class: 'font-mono text-sm text-primary hover:underline'
        },
        `${address.slice(0, 6)}...${address.slice(-4)}`
      )
    }
  },
  {
    id: 'officerVersion',
    accessorFn: row => row.currentOfficer?.version ?? null,
    header: sortableHeader('Version'),
    cell: ({ row }) => {
      const version = row.original.currentOfficer?.version
      if (!version) {
        return h('span', { class: 'text-sm text-muted' }, '—')
      }
      return h(UBadge, { color: 'neutral', variant: 'subtle' }, () => version)
    }
  },
  {
    accessorKey: 'createdAt',
    header: sortableHeader('Created'),
    cell: ({ row }) => {
      const date = dayjs(row.original.createdAt)
      return h('div', { class: 'flex flex-col' }, [
        h('p', { class: 'text-sm' }, date.fromNow()),
        h('p', { class: 'text-xs text-muted' }, date.format('MMM D, YYYY'))
      ])
    }
  }
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
    />

    <AccountingPagination
      v-model:page="page"
      v-model:page-size="pageSize"
      :total="table?.tableApi?.getFilteredRowModel().rows.length ?? 0"
      noun="teams"
    />
  </div>
</template>
