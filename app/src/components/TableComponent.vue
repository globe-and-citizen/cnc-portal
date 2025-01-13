// TableComponent.vue
<template>
  <div class="overflow-x-auto">
    <div v-if="loading" class="flex justify-center items-center py-4">
      <span class="loading-icon" :class="loadingState?.icon">{{ loadingState?.label || 'Loading...' }}</span>
    </div>
    <table v-else class="table table-zebra w-full">
      <thead :class="{ 'sticky top-0': sticky }">
        <tr>
          <th v-for="(column, index) in columns" :key="index" :class="column.class">
            <div class="flex items-center space-x-2">
              <span>{{ column.label }}</span>
              <button v-if="column.sortable" @click="toggleSort(column)" :class="sortButton?.class">
                <span v-if="isSortedAsc(column)">{{ sortAscIcon || '▲' }}</span>
                <span v-if="isSortedDesc(column)">{{ sortDescIcon || '▼' }}</span>
              </button>
            </div>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="!rows.length" class="text-center">
          <td :colspan="columns.length">
            <div class="empty-state flex flex-col items-center space-y-2">
              <span :class="emptyState?.icon">{{ emptyState?.label || 'No data available' }}</span>
            </div>
          </td>
        </tr>
        <tr v-for="(row, rowIndex) in sortedRows" :key="rowIndex" @click="$emit('row-click', row)">
          <td v-for="(column, colIndex) in columns" :key="colIndex">
            <slot :name="`${column.key}-data`" :row="row" :column="column" :getRowData="() => row[column.key]">
              {{ row[column.key] }}
            </slot>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { computed, defineProps, defineEmits } from 'vue';

type Column = {
  key: string;
  label: string;
  sortable?: boolean;
  direction?: 'asc' | 'desc';
  class?: string;
  sort?: (a: any, b: any) => number;
};

type LoadingState = {
  icon?: string;
  label?: string;
};

type EmptyState = {
  icon?: string;
  label?: string;
};

defineProps({
  rows: {
    type: Array as () => Record<string, any>[],
    required: true,
  },
  columns: {
    type: Array as () => Column[],
    required: true,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  sticky: {
    type: Boolean,
    default: false,
  },
  sortMode: {
    type: String as () => 'auto' | 'manual',
    default: 'auto',
  },
  sortButton: {
    type: Object as () => Record<string, any>,
    default: () => ({}),
  },
  sortAscIcon: {
    type: String,
    default: '',
  },
  sortDescIcon: {
    type: String,
    default: '',
  },
  loadingState: {
    type: Object as () => LoadingState,
    default: () => ({}),
  },
  emptyState: {
    type: Object as () => EmptyState,
    default: () => ({}),
  },
});

defineEmits(["update:sort", "row-click"]);

const currentSort = ref<string | null>(null);
const currentDirection = ref<'asc' | 'desc' | null>(null);

const sortedRows = computed(() => {
  if (sortMode === 'manual' || !currentSort.value) {
    return rows;
  }
  return [...rows].sort((a, b) => {
    const sortKey = currentSort.value;
    const direction = currentDirection.value === 'asc' ? 1 : -1;
    if (typeof a[sortKey] === 'string') {
      return direction * a[sortKey].localeCompare(b[sortKey]);
    }
    return direction * (a[sortKey] - b[sortKey]);
  });
});

const toggleSort = (column: Column) => {
  if (currentSort.value === column.key) {
    currentDirection.value = currentDirection.value === 'asc' ? 'desc' : 'asc';
  } else {
    currentSort.value = column.key;
    currentDirection.value = column.direction || 'asc';
  }
  if (sortMode === 'manual') {
    emit('update:sort', { key: currentSort.value, direction: currentDirection.value });
  }
};

const isSortedAsc = (column: Column) => {
  return currentSort.value === column.key && currentDirection.value === 'asc';
};

const isSortedDesc = (column: Column) => {
  return currentSort.value === column.key && currentDirection.value === 'desc';
};
</script>

<style scoped>
/* Add any custom styles */
</style>
