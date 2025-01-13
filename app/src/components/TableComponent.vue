// TableComponent.vue
<template>
  <div class="overflow-x-auto">
    <div v-if="loading" class="flex justify-center items-center py-4">
      <span class="loading-icon" :class="loadingState?.icon">{{
        loadingState?.label || 'Loading...'
      }}</span>
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
            <slot
              :name="`${column.key}-data`"
              :row="row"
              :column="column"
              :getRowData="() => row[column.key]"
            >
              {{ row[column.key] }}
            </slot>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { computed, defineProps, defineEmits, ref } from 'vue'
import type { PropType } from 'vue'

export interface TableRow {
  [key: string]: any
}

export interface TableColumn {
  key: string
  sortable?: boolean
  sort?: (a: any, b: any, direction: 'asc' | 'desc') => number
  direction?: 'asc' | 'desc'
  class?: string
  rowClass?: string
  [key: string]: any
}

interface LoadingState {
  icon?: string
  label?: string
}

interface EmptyState {
  icon?: string
  label?: string
}

const props = defineProps({
  rows: {
    type: Array as PropType<TableRow[]>,
    default: () => []
  },
  columns: {
    type: Array as PropType<TableColumn[]>,
    default: null
  },
  loading: {
    type: Boolean,
    default: false
  },
  sticky: {
    type: Boolean,
    default: false
  },
  sortMode: {
    type: String as PropType<'auto' | 'manual'>,
    default: 'auto'
  },
  sortButton: {
    type: Object as PropType<Record<string, any>>,
    default: () => ({})
  },
  sortAscIcon: {
    type: String,
    default: ''
  },
  sortDescIcon: {
    type: String,
    default: ''
  },
  loadingState: {
    type: Object as PropType<LoadingState>,
    default: () => ({})
  },
  emptyState: {
    type: Object as PropType<EmptyState>,
    default: () => ({})
  }
})

defineEmits(['update:sort', 'row-click'])

// Sort function
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function defaultSort(a: any, b: any, direction: 'asc' | 'desc') {
  if (a === b) {
    return 0
  }

  if (direction === 'asc') {
    return a < b ? -1 : 1
  } else {
    return a > b ? -1 : 1
  }
}
// compute columns, if columns prop is not provided, generate columns from rows
const columns = computed(() => {
  const defaultColumns =
    props.columns ??
    (Object.keys(props.rows[0]).map((key) => ({
      key,
      label: key,
      // label: upperFirst(key),// Update by installing unjs https://github.com/unjs/scule
      sortable: false,
      class: undefined,
      sort: defaultSort
    })) as TableColumn[])

  const hasColumnSelect = defaultColumns.find((v) => v.key === 'select')

  if (hasColumnSelect || !props.modelValue) {
    return defaultColumns
  }

  return [
    {
      key: 'select',
      sortable: false,
      class: undefined,
      sort: defaultSort
    },
    ...defaultColumns
  ]
})

const currentSort = ref<string | null>(null)
const currentDirection = ref<'asc' | 'desc' | null>(null)

const sortedRows = computed(() => {
  if (props.sortMode === 'manual' || !currentSort.value) {
    return props.rows
  }
  return [...props.rows].sort((a, b) => {
    const sortKey = currentSort.value
    const direction = currentDirection.value === 'asc' ? 1 : -1
    if (typeof a[sortKey] === 'string') {
      return direction * a[sortKey].localeCompare(b[sortKey])
    }
    return direction * (a[sortKey] - b[sortKey])
  })
})

const toggleSort = (column: TableColumn) => {
  if (currentSort.value === column.key) {
    currentDirection.value = currentDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    currentSort.value = column.key
    currentDirection.value = column.direction || 'asc'
  }
  if (sortMode === 'manual') {
    emit('update:sort', { key: currentSort.value, direction: currentDirection.value })
  }
}

const isSortedAsc = (column: TableColumn) => {
  return currentSort.value === column.key && currentDirection.value === 'asc'
}

const isSortedDesc = (column: TableColumn) => {
  return currentSort.value === column.key && currentDirection.value === 'desc'
}
</script>

<style scoped>
/* Add any custom styles */
</style>
