// TableComponent.vue
<template>
  <div class="overflow-x-auto">
    <div v-if="loading" class="flex justify-center items-center py-4" data-test="loading">
      <span class="loading-icon" :class="loadingState?.icon">{{
        loadingState?.label || 'Loading...'
      }}</span>
    </div>
    <table v-else class="table table-zebra w-full" data-test="table">
      <thead :class="{ 'sticky top-0': sticky }">
        <tr>
          <th v-for="(column, index) in columns" :key="index" :class="column.class">
            <slot :name="`${column.key}-header`" :column="column" :sort="column.sort">
              <div class="flex items-center space-x-2" :data-test="`${column.key}-header`">
                <span>{{ column.label ?? column.key }}</span>
                <button
                  v-if="column.sortable"
                  @click="toggleSort(column)"
                  :class="sortButton?.class"
                  data-test="sort-button"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke-width="1.5"
                    stroke="currentColor"
                    class="size-5"
                    data-test="sort-icon"
                    v-if="!isSortedAsc(column) && !isSortedDesc(column)"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M3 7.5 7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5 21m0 0L12 16.5m4.5 4.5V7.5"
                    />
                  </svg>

                  <span v-if="isSortedAsc(column)" data-test="sort-asc">
                    {{ sortAscIcon }}
                    <IconComponent
                      icon="heroicons-outline:arrow-up"
                      class="size-5 cursor-pointer"
                      v-if="!sortAscIcon"
                    />
                  </span>
                  <span v-if="isSortedDesc(column)" data-test="sort-desc">
                    {{ sortDescIcon }}
                    <IconComponent
                      icon="heroicons-outline:arrow-down"
                      class="size-5 cursor-pointer"
                      v-if="!sortDescIcon"
                    />
                  </span>
                </button>
              </div>
            </slot>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="!rows.length" class="text-center" data-test="empty-state">
          <td :colspan="columns.length">
            <div class="empty-state flex flex-col items-center space-y-2">
              <span :class="emptyState?.icon">{{ emptyState?.label || 'No data available' }}</span>
            </div>
          </td>
        </tr>
        <tr
          v-for="(row, rowIndex) in sortedRows"
          :key="rowIndex"
          @click="$emit('row-click', row)"
          :data-test="`${rowIndex}-row`"
          class="hover"
        >
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
import { computed, defineEmits, ref } from 'vue'
import IconComponent from '@/components/IconComponent.vue'
import type { PropType } from 'vue'

export interface TableRow {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any
}

export interface TableColumn {
  key: string
  sortable?: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sort?: (a: any, b: any, direction: 'asc' | 'desc') => number
  direction?: 'asc' | 'desc'
  class?: string
  rowClass?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    type: Object as PropType<Record<string, any>>,
    default: () => ({})
  },
  sortAscIcon: {
    type: String
  },
  sortDescIcon: {
    type: String
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

const emit = defineEmits(['update:sort', 'row-click'])

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

// const rows = computed(() => {
//       if (!sort.value?.column || props.sortMode === 'manual') {
//         return props.rows
//       }

//       const { column, direction } = sort.value

//       return props.rows.slice().sort((a, b) => {
//         const aValue = get(a, column)
//         const bValue = get(b, column)

//         const sort = columns.value.find(col => col.key === column)?.sort ?? defaultSort

//         return sort(aValue, bValue, direction)
//       })
//     })

// compute columns, if columns prop is not provided, generate columns from rows
const columns = computed(() => {
  if (!props.columns && !props.rows.length) {
    return [] // Return an empty array if props.rows is empty
  }
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

  return defaultColumns
})

const currentSort = ref<string | null>(null)
const currentDirection = ref<'asc' | 'desc' | null>(null)

const sortedRows = computed(() => {
  const sortKey = currentSort.value
  if (props.sortMode === 'manual' || !sortKey) {
    return props.rows
  }

  return [...props.rows].sort((a, b) => {
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
  if (props.sortMode === 'manual') {
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
