<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui';
import { getPaginationRowModel } from '@tanstack/table-core';
import type { Team } from '~/types';
import { formatDistanceToNow } from 'date-fns';

const UButton = resolveComponent('UButton');
const UBadge = resolveComponent('UBadge');

const props = defineProps<{
  teams: Team[];
  isLoading?: boolean;
}>();

const table = useTemplateRef('table');

const columnFilters = ref([
  {
    id: 'name',
    value: '',
  },
]);
const columnVisibility = ref();

const columns: TableColumn<Team>[] = [
  {
    accessorKey: 'id',
    header: 'ID',
    cell: ({ row }) => `#${row.original.id}`,
  },
  {
    accessorKey: 'name',
    header: ({ column }) => {
      const isSorted = column.getIsSorted();

      return h(UButton, {
        color: 'neutral',
        variant: 'ghost',
        label: 'Name',
        icon: isSorted
          ? isSorted === 'asc'
            ? 'i-lucide-arrow-up-narrow-wide'
            : 'i-lucide-arrow-down-wide-narrow'
          : 'i-lucide-arrow-up-down',
        class: '-mx-2.5',
        onClick: () => column.toggleSorting(column.getIsSorted() === 'asc'),
      });
    },
    cell: ({ row }) => {
      return h('div', { class: 'flex flex-col' }, [
        h('p', { class: 'font-medium text-highlighted' }, row.original.name),
        row.original.description
          ? h('p', { class: 'text-sm text-muted truncate max-w-xs' }, row.original.description)
          : null,
      ]);
    },
  },
  {
    id: 'members',
    accessorFn: (row) => row._count?.members || 0,
    header: 'Members',
    cell: ({ row }) => {
      const count = row.original._count?.members || 0;
      return h(
        UBadge,
        {
          color: 'neutral',
          variant: 'subtle',
        },
        () => `${count} member${count !== 1 ? 's' : ''}`
      );
    },
  },
  {
    accessorKey: 'ownerAddress',
    header: 'Owner',
    cell: ({ row }) => {
      const address = row.original.ownerAddress;
      return h(
        'span',
        { class: 'font-mono text-sm' },
        `${address.slice(0, 6)}...${address.slice(-4)}`
      );
    },
  },
  {
    accessorKey: 'officerAddress',
    header: 'Officer',
    cell: ({ row }) => {
      const address = row.original.officerAddress;
      if (!address) {
        return h(UBadge, { color: 'warning', variant: 'subtle' }, () => 'Not Set');
      }
      return h(
        'span',
        { class: 'font-mono text-sm' },
        `${address.slice(0, 6)}...${address.slice(-4)}`
      );
    },
  },
  {
    accessorKey: 'createdAt',
    header: 'Created',
    cell: ({ row }) => {
      const date = new Date(row.original.createdAt);
      return formatDistanceToNow(date, { addSuffix: true });
    },
  },
];

const pagination = ref({
  pageIndex: 0,
  pageSize: 10,
});
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
        getPaginationRowModel: getPaginationRowModel(),
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
        separator: 'h-0',
      }"
    />

    <div
      v-if="teams.length > pagination.pageSize"
      class="flex items-center justify-between gap-3 border-t border-default pt-4 mt-auto"
    >
      <div class="text-sm text-muted">
        Showing {{ pagination.pageIndex * pagination.pageSize + 1 }} to
        {{ Math.min((pagination.pageIndex + 1) * pagination.pageSize, teams.length) }} of
        {{ teams.length }} teams
      </div>

      <div class="flex items-center gap-1.5">
        <UPagination
          :default-page="(table?.tableApi?.getState().pagination.pageIndex || 0) + 1"
          :items-per-page="table?.tableApi?.getState().pagination.pageSize"
          :total="table?.tableApi?.getFilteredRowModel().rows.length"
          @update:page="(p: number) => table?.tableApi?.setPageIndex(p - 1)"
        />
      </div>
    </div>
  </div>
</template>
