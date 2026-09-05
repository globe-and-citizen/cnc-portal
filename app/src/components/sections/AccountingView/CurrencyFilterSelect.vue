<template>
  <MultiSelectFilter
    :model-value="modelValue"
    :items="items"
    icon="i-heroicons-banknotes"
    singular="currency"
    plural="currencies"
    @update:model-value="emit('update:modelValue', $event)"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import MultiSelectFilter from '@/components/ui/MultiSelectFilter.vue'

// Multi-select currency filter for the General ledger, over the currencies
// present in the data currently in view.
const props = defineProps<{
  modelValue: string[]
  currencies: string[]
}>()
const emit = defineEmits<{ 'update:modelValue': [value: string[]] }>()

const items = computed(() => props.currencies.map((value) => ({ label: value, value })))
</script>
