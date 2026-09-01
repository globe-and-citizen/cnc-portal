<template>
  <UPopover v-model:open="open" :content="{ align: 'end' }">
    <UButton
      color="neutral"
      variant="outline"
      size="sm"
      icon="i-heroicons-view-columns"
      trailing-icon="i-heroicons-chevron-down"
      class="justify-start"
      :ui="{
        trailingIcon: open
          ? 'ms-auto rotate-180 transition-transform'
          : 'ms-auto transition-transform'
      }"
    >
      <span class="truncate">{{ summary }}</span>
    </UButton>

    <template #content>
      <div class="max-h-80 min-w-44 overflow-y-auto p-1">
        <button
          type="button"
          class="hover:bg-elevated flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm"
          @click="toggleAll"
        >
          <UIcon
            :name="allSelected ? 'i-heroicons-check' : 'i-heroicons-minus'"
            class="size-4 shrink-0"
            :class="allSelected ? 'text-primary' : 'text-transparent'"
          />
          All columns
        </button>
        <USeparator class="my-1" />
        <button
          v-for="item in items"
          :key="item.value"
          type="button"
          class="hover:bg-elevated flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm"
          @click="toggle(item.value)"
        >
          <UIcon
            :name="isSelected(item.value) ? 'i-heroicons-check' : 'i-heroicons-minus'"
            class="size-4 shrink-0"
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

export interface ColumnOption<K2 extends string> {
  label: string
  value: K2
}

const props = defineProps<{
  modelValue: K[]
  items: ColumnOption<K>[]
}>()
const emit = defineEmits<{ 'update:modelValue': [value: K[]] }>()

const open = ref(false)

const allSelected = computed(() => props.modelValue.length === props.items.length)

const summary = computed(() => {
  if (allSelected.value) return 'All columns'
  if (props.modelValue.length === 0) return 'No columns'
  if (props.modelValue.length === 1) {
    return props.items.find((item) => item.value === props.modelValue[0])?.label ?? '1 column'
  }
  return `${props.modelValue.length} columns`
})

function isSelected(value: K): boolean {
  return props.modelValue.includes(value)
}

function toggleAll(): void {
  // Already all selected → clear, so the user can pick a fresh subset.
  emit('update:modelValue', allSelected.value ? [] : props.items.map((item) => item.value))
}

function toggle(value: K): void {
  const next = [...props.modelValue]
  const index = next.indexOf(value)
  if (index >= 0) next.splice(index, 1)
  else next.push(value)
  emit('update:modelValue', next)
}
</script>
