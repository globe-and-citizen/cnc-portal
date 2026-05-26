<template>
  <div class="flex items-center justify-between gap-4">
    <USelect
      :model-value="pageSize"
      :items="PAGE_SIZE_OPTIONS"
      class="w-24"
      :data-test="dataTestPrefix ? `${dataTestPrefix}-page-size` : undefined"
      @update:model-value="$emit('update:pageSize', $event)"
    />
    <span class="text-muted text-sm">{{ total }} transactions</span>
    <UPagination
      :page="page"
      :total="total"
      :items-per-page="pageSize"
      :data-test="dataTestPrefix ? `${dataTestPrefix}-pagination` : undefined"
      @update:page="$emit('update:page', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import { PAGE_SIZE_OPTIONS } from '@/composables/transactions/useTransactionTable'

defineProps<{
  page: number
  pageSize: number
  total: number
  dataTestPrefix?: string
}>()

defineEmits<{
  'update:page': [value: number]
  'update:pageSize': [value: number]
}>()
</script>
