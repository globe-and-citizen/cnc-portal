<script setup lang="ts">
import { shortenAddress } from '~/utils/generalUtil'

defineProps<{
  address: string | null
  label?: string
}>()
</script>

<template>
  <span v-if="!address" class="text-sm text-dimmed">—</span>
  <span v-else class="inline-flex items-center gap-1">
    <a
      :href="`https://polygonscan.com/address/${address}`"
      target="_blank"
      rel="noopener noreferrer"
      class="font-mono text-sm text-primary hover:underline"
    >
      {{ shortenAddress(address) }}
    </a>
    <CopyButton :value="address" :label="label ?? 'Address copied'" />
  </span>
</template>
