<template>
  <div
    v-if="total > 0"
    class="mt-4 flex flex-col gap-3 border-t border-default pt-4 sm:flex-row sm:items-center sm:justify-between"
  >
    <div class="flex items-center gap-3">
      <p class="text-sm text-muted">
        Showing
        <span class="font-medium text-default">{{ rangeStart }}–{{ rangeEnd }}</span>
        of
        <span class="font-medium text-default">{{ total }}</span>
        {{ noun }}
      </p>
      <USelect
        :model-value="pageSize"
        :items="pageSizeOptions"
        size="sm"
        class="w-auto"
        @update:model-value="onPageSizeChange"
      />
    </div>

    <UPagination
      :page="page"
      :items-per-page="pageSize"
      :total="total"
      :sibling-count="1"
      show-edges
      color="neutral"
      variant="outline"
      @update:page="(p: number) => emit('update:page', p)"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

/**
 * Reusable table pagination footer: a "Showing X–Y of Z <noun>" summary, a
 * page-size selector (10/20/50/100) and the Nuxt UI page control. Both `page`
 * and `pageSize` are v-model bindings; changing the page size resets to page 1.
 */
const props = withDefaults(defineProps<{
  page: number
  pageSize: number
  total: number
  /** Plural noun for the summary line, e.g. "transactions", "trades". */
  noun?: string
}>(), {
  noun: 'items'
})

const emit = defineEmits<{
  'update:page': [value: number]
  'update:pageSize': [value: number]
}>()

const pageSizeOptions = [
  { label: '10', value: 10 },
  { label: '20', value: 20 },
  { label: '50', value: 50 },
  { label: '100', value: 100 }
]

const rangeStart = computed(() => (props.total === 0 ? 0 : (props.page - 1) * props.pageSize + 1))
const rangeEnd = computed(() => Math.min(props.page * props.pageSize, props.total))

function onPageSizeChange(value: number): void {
  emit('update:pageSize', value)
  emit('update:page', 1)
}
</script>
