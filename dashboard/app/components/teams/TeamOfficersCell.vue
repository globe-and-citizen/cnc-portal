<script setup lang="ts">
import dayjs from 'dayjs'
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
        class="flex items-start gap-1.5"
      >
        <UIcon
          v-if="index > 0"
          name="i-lucide-corner-down-right"
          class="size-3 text-muted shrink-0 mt-1"
        />
        <div class="flex flex-col gap-0.5">
          <div class="flex items-center gap-1.5">
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

          <!-- Deploy metadata: block number (links to Polygonscan) + timestamp. -->
          <div class="flex items-center gap-2 text-[11px] text-muted">
            <a
              v-if="officer.deployBlockNumber"
              :href="`https://polygonscan.com/block/${officer.deployBlockNumber}`"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-1 hover:underline"
            >
              <UIcon name="i-lucide-box" class="size-3" />
              <span class="font-mono">#{{ officer.deployBlockNumber }}</span>
            </a>
            <span v-if="officer.deployedAt" class="inline-flex items-center gap-1">
              <UIcon name="i-lucide-clock" class="size-3" />
              {{ dayjs(officer.deployedAt).format('MMM D, YYYY HH:mm') }}
            </span>
            <!-- FactoryBeacon that deployed this Officer, read on-chain from
                 the proxy's ERC-1967 beacon slot. -->
            <OfficerBeacon :address="officer.address" />
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
