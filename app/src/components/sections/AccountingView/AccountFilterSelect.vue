<template>
  <UPopover v-model:open="open" :content="{ align: 'end' }">
    <UButton
      color="neutral"
      variant="outline"
      size="sm"
      icon="i-heroicons-rectangle-stack"
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
      <div class="max-h-80 min-w-56 overflow-y-auto p-1">
        <button
          type="button"
          class="hover:bg-elevated flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm"
          data-test="account-filter-all"
          @click="toggleAll"
        >
          <UIcon
            :name="allSelected ? 'i-heroicons-check' : 'i-heroicons-minus'"
            class="size-4 shrink-0"
            :class="allSelected ? 'text-primary' : 'text-transparent'"
          />
          All accounts
        </button>
        <USeparator class="my-1" />
        <button
          v-for="account in accounts"
          :key="account"
          type="button"
          class="hover:bg-elevated flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm"
          :data-test="`account-filter-${account}`"
          @click="toggle(account)"
        >
          <UIcon
            :name="isSelected(account) ? 'i-heroicons-check' : 'i-heroicons-minus'"
            class="size-4 shrink-0"
            :class="isSelected(account) ? 'text-primary' : 'text-transparent'"
          />
          {{ account }}
        </button>
      </div>
    </template>
  </UPopover>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

// Multi-select account filter for the General ledger — mirrors
// ColumnVisibilitySelect / CurrencyFilterSelect's style and "All" behaviour, over
// the accounts present in the data currently in view. Selecting one or more
// accounts narrows the journal to the postings that touch them (both legs shown).
const props = defineProps<{
  modelValue: string[]
  accounts: string[]
}>()
const emit = defineEmits<{ 'update:modelValue': [value: string[]] }>()

const open = ref(false)

const allSelected = computed(() => props.modelValue.length === props.accounts.length)

const summary = computed(() => {
  if (allSelected.value) return 'All accounts'
  if (props.modelValue.length === 0) return 'No accounts'
  if (props.modelValue.length === 1) return props.modelValue[0]
  return `${props.modelValue.length} accounts`
})

function isSelected(account: string): boolean {
  return props.modelValue.includes(account)
}

function toggleAll(): void {
  // Already all selected → clear, so the user can pick a fresh subset.
  emit('update:modelValue', allSelected.value ? [] : [...props.accounts])
}

function toggle(account: string): void {
  const next = [...props.modelValue]
  const index = next.indexOf(account)
  if (index >= 0) next.splice(index, 1)
  else next.push(account)
  emit('update:modelValue', next)
}
</script>
