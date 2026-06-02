<template>
  <UPopover v-model:open="open" :content="{ align: 'end' }">
    <UButton
      color="neutral"
      variant="outline"
      size="sm"
      icon="i-lucide-list-filter"
      trailing-icon="i-lucide-chevron-down"
      class="w-44 justify-start"
      :ui="{ trailingIcon: open ? 'ms-auto rotate-180 transition-transform' : 'ms-auto transition-transform' }"
    >
      <span class="truncate">{{ summary }}</span>
    </UButton>

    <template #content>
      <div class="p-1 min-w-44 max-h-80 overflow-y-auto">
        <button
          type="button"
          class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-elevated"
          @click="toggleAll"
        >
          <UIcon
            :name="allSelected ? 'i-lucide-check' : 'i-lucide-minus'"
            class="w-4 h-4 shrink-0"
            :class="allSelected ? 'text-primary' : 'text-transparent'"
          />
          All categories
        </button>
        <USeparator class="my-1" />
        <button
          v-for="item in items"
          :key="item.value"
          type="button"
          class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-elevated"
          @click="toggle(item.value)"
        >
          <UIcon
            :name="isSelected(item.value) ? 'i-lucide-check' : 'i-lucide-minus'"
            class="w-4 h-4 shrink-0"
            :class="isSelected(item.value) ? 'text-primary' : 'text-transparent'"
          />
          {{ item.label }}
        </button>
      </div>
    </template>
  </UPopover>
</template>

<script setup lang="ts" generic="K extends string">
import { computed, ref } from 'vue'

/**
 * Multi-select category filter for the General Ledger. Mirrors the
 * `AccountingColumnVisibility` popover pattern: a single `UButton` trigger
 * summarising the selection plus a list of toggleable entries. "All categories"
 * toggles the whole set — selecting everything, or clearing it so the user can
 * pick a fresh subset. An empty selection is allowed (the ledger then shows no
 * rows).
 */

export interface CategoryOption<K2 extends string> {
  label: string
  value: K2
}

const props = defineProps<{
  modelValue: K[]
  items: CategoryOption<K>[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: K[]]
}>()

const open = ref(false)

const allSelected = computed(() => props.modelValue.length === props.items.length)

const summary = computed(() => {
  if (allSelected.value) {
    return 'All categories'
  }
  if (props.modelValue.length === 0) {
    return 'No categories'
  }
  if (props.modelValue.length === 1) {
    return props.items.find(item => item.value === props.modelValue[0])?.label ?? '1 category'
  }
  return `${props.modelValue.length} categories`
})

function isSelected(value: K): boolean {
  return props.modelValue.includes(value)
}

function toggleAll(): void {
  // Already all selected → clear, so the user can pick a fresh subset.
  emit('update:modelValue', allSelected.value ? [] : props.items.map(item => item.value))
}

function toggle(value: K): void {
  const next = [...props.modelValue]
  const idx = next.indexOf(value)
  if (idx >= 0) {
    next.splice(idx, 1)
  } else {
    next.push(value)
  }
  emit('update:modelValue', next)
}
</script>
