<template>
  <UPopover v-model:open="open" :content="{ align: 'end' }">
    <UButton
      color="neutral"
      variant="outline"
      size="sm"
      icon="i-heroicons-banknotes"
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
          All currencies
        </button>
        <USeparator class="my-1" />
        <button
          v-for="currency in currencies"
          :key="currency"
          type="button"
          class="hover:bg-elevated flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm"
          @click="toggle(currency)"
        >
          <UIcon
            :name="isSelected(currency) ? 'i-heroicons-check' : 'i-heroicons-minus'"
            class="size-4 shrink-0"
            :class="isSelected(currency) ? 'text-primary' : 'text-transparent'"
          />
          {{ currency }}
        </button>
      </div>
    </template>
  </UPopover>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

// Multi-select currency filter for the General ledger — mirrors
// ColumnVisibilitySelect's style and "All" behaviour, over the currencies
// present in the data currently in view.
const props = defineProps<{
  modelValue: string[]
  currencies: string[]
}>()
const emit = defineEmits<{ 'update:modelValue': [value: string[]] }>()

const open = ref(false)

const allSelected = computed(() => props.modelValue.length === props.currencies.length)

const summary = computed(() => {
  if (allSelected.value) return 'All currencies'
  if (props.modelValue.length === 0) return 'No currencies'
  if (props.modelValue.length === 1) return props.modelValue[0]
  return `${props.modelValue.length} currencies`
})

function isSelected(currency: string): boolean {
  return props.modelValue.includes(currency)
}

function toggleAll(): void {
  // Already all selected → clear, so the user can pick a fresh subset.
  emit('update:modelValue', allSelected.value ? [] : [...props.currencies])
}

function toggle(currency: string): void {
  const next = [...props.modelValue]
  const index = next.indexOf(currency)
  if (index >= 0) next.splice(index, 1)
  else next.push(currency)
  emit('update:modelValue', next)
}
</script>
