<script setup lang="ts">
import { useTeamOfficersQuery } from '~/queries/contract.query'
import { shortenAddress } from '~/utils/generalUtil'

const props = defineProps<{
  teamId: number
}>()

// Pass a reactive getter so the query re-keys if the row's team changes.
const { data: officers, isLoading, isError } = useTeamOfficersQuery(() => props.teamId)
</script>

<template>
  <div class="flex flex-col gap-1">
    <USkeleton v-if="isLoading" class="h-4 w-24" />

    <span v-else-if="isError" class="text-xs text-error">Failed to load</span>

    <span v-else-if="!officers?.length" class="text-sm text-muted">—</span>

    <template v-else>
      <!-- Newest-first chain; each Officer links to Polygonscan. The current
           head is highlighted, older generations are muted. -->
      <div
        v-for="(officer, index) in officers"
        :key="officer.id"
        class="flex items-center gap-1.5"
      >
        <UIcon
          v-if="index > 0"
          name="i-lucide-corner-down-right"
          class="size-3 text-muted shrink-0"
        />
        <UBadge
          :color="officer.isCurrent ? 'primary' : 'neutral'"
          variant="subtle"
          class="shrink-0"
        >
          {{ officer.version || 'unknown' }}
        </UBadge>
        <a
          :href="`https://polygonscan.com/address/${officer.address}`"
          target="_blank"
          rel="noopener noreferrer"
          class="font-mono text-xs text-primary hover:underline"
        >
          {{ shortenAddress(officer.address) }}
        </a>
        <UBadge
          v-if="officer.isCurrent"
          color="success"
          variant="subtle"
          size="sm"
        >
          current
        </UBadge>
      </div>
    </template>
  </div>
</template>
