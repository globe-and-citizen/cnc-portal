<template>
  <MultiSelectFilter
    :model-value="modelValue"
    :items="items"
    icon="i-heroicons-rectangle-stack"
    singular="account"
    plural="accounts"
    menu-class="min-w-56"
    data-test-prefix="account-filter"
    @update:model-value="emit('update:modelValue', $event)"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import MultiSelectFilter from '@/components/ui/MultiSelectFilter.vue'

export interface AccountFilterOption {
  value: string
  label: string
}

// Multi-select account filter for the General ledger, over the accounts present
// in the data currently in view. Selecting one or more accounts narrows the
// journal to the postings that touch them (both legs shown).
const props = defineProps<{
  modelValue: string[]
  accounts: Array<string | AccountFilterOption>
}>()
const emit = defineEmits<{ 'update:modelValue': [value: string[]] }>()

const items = computed(() =>
  props.accounts.map((account) =>
    typeof account === 'string' ? { label: account, value: account } : account
  )
)
</script>
