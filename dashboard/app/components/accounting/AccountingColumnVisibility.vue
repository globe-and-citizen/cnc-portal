<template>
  <UPopover v-model:open="open" :content="{ align: 'end' }">
    <UButton
      color="neutral"
      variant="outline"
      size="sm"
      icon="i-lucide-columns-3"
      trailing-icon="i-lucide-chevron-down"
      :ui="{ trailingIcon: open ? 'rotate-180 transition-transform' : 'transition-transform' }"
    >
      Columns<span v-if="hiddenCount > 0" class="text-muted">· {{ hiddenCount }} hidden</span>
    </UButton>

    <template #content>
      <div class="p-1 min-w-44 max-h-80 overflow-y-auto">
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
 * Column-visibility picker for the General Ledger. Uses a single `UPopover`
 * trigger (no nested select/button chrome) and toggles visible keys via
 * `v-model`.
 */

export interface ColumnOption<K2 extends string> {
  label: string
  value: K2
}

const props = defineProps<{
  modelValue: K[]
  items: ColumnOption<K>[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: K[]]
}>()

const open = ref(false)

const hiddenCount = computed(() => props.items.length - props.modelValue.length)

function isSelected(value: K): boolean {
  return props.modelValue.includes(value)
}

function toggle(value: K): void {
  const next = [...props.modelValue]
  const idx = next.indexOf(value)
  if (idx >= 0) {
    if (next.length <= 1) {
      return
    }
    next.splice(idx, 1)
  } else {
    next.push(value)
  }
  emit('update:modelValue', next)
}
</script>
