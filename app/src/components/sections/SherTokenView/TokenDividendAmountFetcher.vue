<template>
  <!-- headless fetcher -->
  <span style="display: none"></span>
</template>

<script setup lang="ts">
import { watch } from 'vue'
import { zeroAddress, type Address } from 'viem'
import { useBankContract } from '@/composables/bank'

const props = defineProps<{
  tokenAddress: Address // zeroAddress => native
  shareholder: Address
}>()

const emit = defineEmits<{
  update: [{ tokenAddress: Address; amount: bigint }]
}>()

const { useDividendBalance, useTokenDividendBalance } = useBankContract()

const isNative = props.tokenAddress === zeroAddress
const { data } = isNative
  ? useDividendBalance(props.shareholder)
  : useTokenDividendBalance(props.tokenAddress, props.shareholder)

watch(
  () => data?.value,
  (val) => emit('update', { tokenAddress: props.tokenAddress, amount: val ?? 0n }),
  { immediate: true }
)
</script>
