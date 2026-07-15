<script setup lang="ts">
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { useTeamOfficersQuery } from '~/queries/contract.query'
import { shortenAddress } from '~/utils/generalUtil'

dayjs.extend(relativeTime)

const props = defineProps<{
  teamId: number
}>()

// Pass a reactive getter so the query re-keys if the row's team changes.
const { data: officers, isLoading, isError } = useTeamOfficersQuery(() => props.teamId)
</script>

<template>
  <div class="py-1">
    <!-- Loading: mimic the eventual card stack so height stays stable. -->
    <div v-if="isLoading" class="flex flex-col gap-2">
      <USkeleton class="h-16 w-full rounded-lg" />
      <USkeleton class="h-16 w-full rounded-lg opacity-60" />
    </div>

    <div
      v-else-if="isError"
      class="flex items-center gap-1.5 text-xs text-error"
    >
      <UIcon name="i-lucide-triangle-alert" class="size-3.5" />
      Failed to load officers
    </div>

    <div
      v-else-if="!officers?.length"
      class="flex items-center gap-1.5 text-sm text-muted"
    >
      <UIcon name="i-lucide-circle-slash" class="size-3.5" />
      No officer deployed
    </div>

    <!-- Timeline: newest first. A continuous rail (border-l) threads the dots;
         each generation is a card, the current head highlighted. -->
    <ol v-else class="flex flex-col gap-2.5 border-l border-default ml-1 pl-4">
      <li
        v-for="officer in officers"
        :key="officer.id"
        class="relative"
      >
        <!-- Timeline node, overlapping the rail. -->
        <span
          class="absolute left-[-1.31rem] top-3 size-2.5 rounded-full ring-4 ring-white dark:ring-neutral-900"
          :class="officer.isCurrent ? 'bg-primary' : 'bg-neutral-400 dark:bg-neutral-600'"
        />

        <div
          class="rounded-lg border p-2.5 transition-colors"
          :class="officer.isCurrent
            ? 'border-primary/40 bg-primary/5'
            : 'border-default bg-elevated'"
        >
          <!-- Header: version + current badge -->
          <div class="flex items-center justify-between gap-2">
            <UBadge
              :color="officer.isCurrent ? 'primary' : 'neutral'"
              variant="subtle"
              class="font-semibold"
            >
              {{ officer.version || 'unknown' }}
            </UBadge>
            <UBadge
              v-if="officer.isCurrent"
              color="success"
              variant="soft"
              size="sm"
              icon="i-lucide-circle-check"
            >
              current
            </UBadge>
          </div>

          <!-- Address -->
          <div class="mt-2 flex items-center gap-1">
            <UIcon name="i-lucide-shield" class="size-3.5 text-muted shrink-0" />
            <a
              :href="`https://polygonscan.com/address/${officer.address}`"
              target="_blank"
              rel="noopener noreferrer"
              class="font-mono text-xs text-primary hover:underline"
            >
              {{ shortenAddress(officer.address) }}
            </a>
            <UIcon name="i-lucide-external-link" class="size-3 text-dimmed" />
            <CopyButton :value="officer.address" label="Officer address copied" />
          </div>

          <!-- Deploy metadata -->
          <dl class="mt-2 flex flex-col gap-1 text-[11px]">
            <div v-if="officer.deployBlockNumber" class="flex items-center gap-1.5">
              <UIcon name="i-lucide-box" class="size-3 text-dimmed shrink-0" />
              <dt class="text-muted w-16 shrink-0">
                Block
              </dt>
              <dd>
                <a
                  :href="`https://polygonscan.com/block/${officer.deployBlockNumber}`"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="font-mono text-muted hover:text-primary hover:underline"
                >
                  #{{ officer.deployBlockNumber }}
                </a>
              </dd>
            </div>

            <div v-if="officer.deployedAt" class="flex items-center gap-1.5">
              <UIcon name="i-lucide-clock" class="size-3 text-dimmed shrink-0" />
              <dt class="text-muted w-16 shrink-0">
                Deployed
              </dt>
              <dd class="text-muted">
                {{ dayjs(officer.deployedAt).format('MMM D, YYYY HH:mm') }}
                <span class="text-dimmed">· {{ dayjs(officer.deployedAt).fromNow() }}</span>
              </dd>
            </div>

            <div class="flex items-center gap-1.5">
              <UIcon name="i-lucide-radio-tower" class="size-3 text-dimmed shrink-0" />
              <dt class="text-muted w-16 shrink-0">
                Beacon
              </dt>
              <dd>
                <!-- FactoryBeacon that deployed this Officer, read on-chain from
                     the proxy's ERC-1967 beacon slot. -->
                <OfficerBeacon :address="officer.address" />
              </dd>
            </div>
          </dl>
        </div>
      </li>
    </ol>
  </div>
</template>
