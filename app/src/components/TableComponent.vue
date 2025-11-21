// TableComponent.vue
<template>
  <div :class="overflow">
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
                    <IconifyIcon icon="heroicons:chevron-up" class="w-4 h-4 text-gray-400" />
                  </span>
                  <span v-if="isSortedDesc(column)" data-test="sort-desc">
                    {{ sortDescIcon }}
                    <IconifyIcon icon="heroicons:chevron-down" class="w-4 h-4 text-gray-400" />
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
          v-for="(row, rowIndex) in paginatedRows"
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

    <div
      v-if="showPagination && totalPages > 1"
      class="flex justify-between items-center mt-4 px-2"
    >
      <div class="flex items-center space-x-2">
        <slot
          name="pagination-info"
          :start-index="startIndex"
          :end-index="endIndex"
          :total-items="totalItems"
        >
          <span class="text-sm text-gray-600">
            Showing {{ startIndex + 1 }} to {{ endIndex }} of {{ totalItems }} entries
          </span>
        </slot>
      </div>
      <div class="flex items-center space-x-2">
        <slot
          name="pagination-controls"
          :current-page="currentPage"
          :total-pages="totalPages"
          :go-to-page="goToPage"
          :previous-page="previousPage"
          :next-page="nextPage"
        >
          <div class="join">
            <button
              class="join-item btn btn-sm"
              :disabled="currentPage === 1"
              @click="previousPage"
              data-test="previous-page"
            >
              <IconifyIcon icon="heroicons:chevron-left" class="w-4 h-4" />
            </button>
            <button
              v-for="page in displayedPages"
              :key="page"
              class="join-item btn btn-sm"
              :class="{ 'btn-active btn-primary': page === currentPage }"
              @click="goToPage(page)"
              :data-test="`page-${page}`"
            >
              {{ page }}
            </button>
            <button
              class="join-item btn btn-sm"
              :disabled="currentPage === totalPages"
              @click="nextPage"
              data-test="next-page"
            >
              <IconifyIcon icon="heroicons:chevron-right" class="w-4 h-4" />
            </button>
          </div>
        </slot>
      </div>
      <div class="flex items-center space-x-2">
        <slot name="items-per-page">
          <select
            v-model="itemsPerPage"
            class="select select-sm select-bordered"
            data-test="items-per-page"
          >
            <option v-for="size in pageSizeOptions" :key="size" :value="size">
              {{ size }} per page
            </option>
          </select>
        </slot>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Icon as IconifyIcon } from '@iconify/vue'
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

export interface LoadingState {
  icon?: string
  label?: string
}

export interface EmptyState {
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
  },
  showPagination: {
    type: Boolean,
    default: true
  },
  currentPageProp: {
    type: Number,
    default: 1
  },
  itemsPerPageProp: {
    type: Number,
    default: 10,
    validator: (value: number) => value <= 20 // Ensure value doesn't exceed 20
  },
  pageSizeOptions: {
    type: Array as PropType<number[]>,
    default: () => [5, 10, 15, 20]
  },
  maxDisplayedPages: {
    type: Number,
    default: 5
  },
  overflow: {
    type: String,
    default: 'overflow-x-auto'
  }
})

const emit = defineEmits(['update:sort', 'row-click', 'update:currentPage', 'update:itemsPerPage'])

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

// Pagination state
const currentPage = ref(props.currentPageProp)
const itemsPerPage = ref(props.itemsPerPageProp)

// Watch for prop changes
watch(
  () => props.currentPageProp,
  (newVal) => {
    currentPage.value = newVal
  }
)

watch(
  () => props.itemsPerPageProp,
  (newVal) => {
    itemsPerPage.value = newVal
  }
)

// Watch for internal changes
watch(currentPage, (newVal) => {
  emit('update:currentPage', newVal)
})

watch(itemsPerPage, (newVal) => {
  emit('update:itemsPerPage', newVal)
  // Reset to first page when changing items per page
  currentPage.value = 1
})

// Pagination computed properties
const totalItems = computed(() => sortedRows.value.length)
const totalPages = computed(() => Math.ceil(totalItems.value / itemsPerPage.value))
const startIndex = computed(() => (currentPage.value - 1) * itemsPerPage.value)
const endIndex = computed(() => Math.min(startIndex.value + itemsPerPage.value, totalItems.value))

const paginatedRows = computed(() => {
  return sortedRows.value.slice(startIndex.value, endIndex.value)
})

const displayedPages = computed(() => {
  const maxPages = props.maxDisplayedPages
  const halfMax = Math.floor(maxPages / 2)
  let start = Math.max(currentPage.value - halfMax, 1)
  const end = Math.min(start + maxPages - 1, totalPages.value)

  if (end - start + 1 < maxPages) {
    start = Math.max(end - maxPages + 1, 1)
  }

  return Array.from({ length: end - start + 1 }, (_, i) => start + i)
})

// Pagination methods
const goToPage = (page: number) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
  }
}

const previousPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--
  }
}

const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++
  }
}
</script>

<style scoped>
/* Add any custom styles */
</style>
