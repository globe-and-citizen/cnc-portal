<template>
  <span v-if="isLoading" class="text-xs text-gray-400">…</span>
  <span v-else class="font-medium">{{ formatted }}</span>
</template>

<script setup lang="ts">
import { computed, toRef } from 'vue'
import type { Address } from 'viem'
import { useContractBalance } from '@/composables/useContractBalance'

const props = defineProps<{ address: Address }>()

const { data: balance, isLoading } = useContractBalance(toRef(props, 'address'))

const formatted = computed(() => balance.value?.total.local.formatted ?? '$0.00')
</script>
