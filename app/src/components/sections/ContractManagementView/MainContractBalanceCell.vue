<template>
  <span v-if="isLoading" class="text-xs text-gray-400">…</span>
  <span v-else class="font-medium">{{ formatted }}</span>
</template>

<script setup lang="ts">
import { computed, toRef } from 'vue'
import type { Address } from 'viem'
import { useContractBalance } from '@/composables/useContractBalance'
import { useCurrencyStore } from '@/stores'

const props = defineProps<{ address: Address }>()

const currencyStore = useCurrencyStore()
const { total, isLoading } = useContractBalance(toRef(props, 'address'))

const currencyCode = computed(() => currencyStore.localCurrency.code)
const formatted = computed(() => total.value[currencyCode.value]?.formated ?? '$0.00')
</script>
