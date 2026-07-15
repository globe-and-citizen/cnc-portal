<script setup lang="ts">
import { useOfficerBeaconQuery } from '~/queries/officerBeacon.query'
import { shortenAddress } from '~/utils/generalUtil'

const props = defineProps<{
  address: string
}>()

const { data: beacon, isLoading, isError } = useOfficerBeaconQuery(() => props.address)
</script>

<template>
  <div class="inline-flex items-center gap-1 text-[11px] text-muted">
    <UIcon name="i-lucide-factory" class="size-3 shrink-0" />

    <USkeleton v-if="isLoading" class="h-3 w-16" />

    <span v-else-if="isError" class="text-error">beacon?</span>

    <span v-else-if="!beacon">no beacon</span>

    <a
      v-else
      :href="`https://polygonscan.com/address/${beacon}`"
      target="_blank"
      rel="noopener noreferrer"
      class="font-mono hover:underline"
    >
      {{ shortenAddress(beacon) }}
    </a>
  </div>
</template>
