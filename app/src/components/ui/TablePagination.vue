<template>
  <div
    v-if="total > 0"
    class="border-default mt-4 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between"
  >
    <div class="flex items-center gap-3">
      <p class="text-muted text-sm">
        Showing
        <span class="text-default font-medium">{{ rangeStart }}–{{ rangeEnd }}</span>
        of
        <span class="text-default font-medium">{{ total }}</span>
        {{ noun }}
      </p>
      <USelect
        :model-value="pageSize"
        :items="PAGE_SIZE_OPTIONS"
        size="sm"
        class="w-auto"
        :data-test="dataTestPrefix ? `${dataTestPrefix}-page-size` : undefined"
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
      :data-test="dataTestPrefix ? `${dataTestPrefix}-pagination` : undefined"
      @update:page="(p: number) => emit('update:page', p)"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

/**
 * Reusable table pagination footer: a "Showing X–Y of Z <noun>" summary, a
 * page-size selector (10/20/50/100) and the Nuxt UI page control (next/previous,
 * first/last via `show-edges`, and jump-to-page via the numbered buttons, with
 * disabled boundary states handled by `UPagination`). Both `page` and `pageSize`
 * are v-model bindings; this component is purely presentational and emits the raw
 * user intent — resize anchoring (which page to land on when the size changes) is
 * decided by the owner (see `usePagination`). Renders nothing when `total` is 0;
 * the page control stays visible even on a single page (it just shows page 1 with
 * the prev/next/edge buttons disabled) so the footer is consistent across tables.
 */
const props = withDefaults(
  defineProps<{
    page: number
    pageSize: number
    total: number
    /** Plural noun for the summary line, e.g. "claims", "transactions". */
    noun?: string
    /** Optional prefix for `data-test` hooks on the selector and page control. */
    dataTestPrefix?: string
  }>(),
  {
    noun: 'items',
    dataTestPrefix: undefined
  }
)

const emit = defineEmits<{
  'update:page': [value: number]
  'update:pageSize': [value: number]
}>()

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100]

const rangeStart = computed(() => (props.total === 0 ? 0 : (props.page - 1) * props.pageSize + 1))
const rangeEnd = computed(() => Math.min(props.page * props.pageSize, props.total))

function onPageSizeChange(value: number): void {
  emit('update:pageSize', value)
}
</script>
