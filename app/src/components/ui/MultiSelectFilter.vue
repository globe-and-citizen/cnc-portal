<template>
  <UPopover v-model:open="open" :content="{ align: 'end' }">
    <UButton
      color="neutral"
      variant="outline"
      size="sm"
      :icon="icon"
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
      <div class="max-h-80 overflow-y-auto p-1" :class="menuClass">
        <button type="button" :class="OPTION_CLASS" :data-test="dataTest('all')" @click="toggleAll">
          <UIcon
            :name="allSelected ? 'i-heroicons-check' : 'i-heroicons-minus'"
            class="size-4 shrink-0"
            :class="allSelected ? 'text-primary' : 'text-transparent'"
          />
          All {{ plural }}
        </button>
        <USeparator class="my-1" />
        <button
          v-for="item in items"
          :key="item.value"
          type="button"
          :class="OPTION_CLASS"
          :data-test="dataTest(item.value)"
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

<script setup lang="ts" generic="V extends string">
import { computed, ref } from 'vue'

export interface MultiSelectOption<T extends string> {
  label: string
  value: T
}

/**
 * The popover multi-select shared by every "narrow this table" filter — columns,
 * accounts, currencies. One implementation of the "All / none / n selected"
 * behaviour, named per use by a thin wrapper that supplies the icon and noun.
 */
const props = withDefaults(
  defineProps<{
    modelValue: V[]
    items: MultiSelectOption<V>[]
    /** Trigger icon, e.g. `i-heroicons-view-columns`. */
    icon: string
    /** What is being selected, singular then plural — "1 column" / "3 columns". */
    singular: string
    plural: string
    /** Tailwind width class for the menu, widened for long option labels. */
    menuClass?: string
    /** When set, every option carries `data-test="<prefix>-<value>"`. */
    dataTestPrefix?: string
  }>(),
  { menuClass: 'min-w-44', dataTestPrefix: undefined }
)
const emit = defineEmits<{ 'update:modelValue': [value: V[]] }>()

const OPTION_CLASS =
  'hover:bg-elevated flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm'

const open = ref(false)

const allSelected = computed(() => props.modelValue.length === props.items.length)

const summary = computed(() => {
  if (allSelected.value) return `All ${props.plural}`
  if (props.modelValue.length === 0) return `No ${props.plural}`
  if (props.modelValue.length === 1) {
    return (
      props.items.find((item) => item.value === props.modelValue[0])?.label ?? `1 ${props.singular}`
    )
  }
  return `${props.modelValue.length} ${props.plural}`
})

function dataTest(value: string): string | undefined {
  return props.dataTestPrefix ? `${props.dataTestPrefix}-${value}` : undefined
}

function isSelected(value: V): boolean {
  return props.modelValue.includes(value)
}

function toggleAll(): void {
  // Already all selected → clear, so the user can pick a fresh subset.
  emit('update:modelValue', allSelected.value ? [] : props.items.map((item) => item.value))
}

function toggle(value: V): void {
  const next = [...props.modelValue]
  const index = next.indexOf(value)
  if (index >= 0) next.splice(index, 1)
  else next.push(value)
  emit('update:modelValue', next)
}
</script>
