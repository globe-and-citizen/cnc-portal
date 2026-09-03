<template>
  <MultiSelectFilter
    :model-value="modelValue"
    :items="items"
    icon="i-heroicons-view-columns"
    singular="column"
    plural="columns"
    @update:model-value="emit('update:modelValue', $event)"
  />
</template>

<script setup lang="ts" generic="K extends string">
import MultiSelectFilter, { type MultiSelectOption } from '@/components/ui/MultiSelectFilter.vue'

export type ColumnOption<K2 extends string> = MultiSelectOption<K2>

// Show/hide the table's columns — {@link MultiSelectFilter} over the column list.
defineProps<{
  modelValue: K[]
  items: ColumnOption<K>[]
}>()
const emit = defineEmits<{ 'update:modelValue': [value: K[]] }>()
</script>
