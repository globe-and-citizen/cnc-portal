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
    <!-- Loading: mimic the eventual horizontal card row so height stays stable. -->
    <div v-if="isLoading" class="flex gap-4 pt-5">
      <USkeleton class="h-32 w-72 shrink-0 rounded-lg" />
      <USkeleton class="h-32 w-72 shrink-0 rounded-lg opacity-60" />
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

    <!-- Timeline: newest first, laid out horizontally. A continuous rail
         (the ::before line) threads the dots; each generation is a card, the
         current head highlighted. Scrolls horizontally when there are many. -->
    <ol
      v-else
      class="relative flex gap-4 overflow-x-auto pt-5 pb-1
             before:content-[''] before:absolute before:top-[0.6875rem]
             before:left-0 before:right-0 before:h-px before:bg-default"
    >
      <li
        v-for="officer in officers"
        :key="officer.id"
        class="relative shrink-0 w-96"
      >
        <!-- Timeline node, centered over the card and sitting on the rail. -->
        <span
          class="absolute top-[0.375rem] left-1/2 -translate-x-1/2 size-2.5 rounded-full ring-4 ring-white dark:ring-neutral-900"
          :class="officer.isCurrent ? 'bg-primary' : 'bg-neutral-400 dark:bg-neutral-600'"
        />

        <div
          class="rounded-lg border p-4 transition-colors h-full"
          :class="officer.isCurrent
            ? 'border-primary/40 bg-primary/5'
            : 'border-default bg-elevated'"
        >
          <!-- Header: version + registry version + current badge -->
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-1.5">
              <UBadge
                :color="officer.isCurrent ? 'primary' : 'neutral'"
                variant="subtle"
                size="lg"
                class="font-semibold"
              >
                {{ officer.version || 'unknown' }}
              </UBadge>
              <!-- Registry generation (V0 / V0.1 / V1) matched from the beacon. -->
              <OfficerRegistryVersion :address="officer.address" />
            </div>
            <UBadge
              v-if="officer.isCurrent"
              color="success"
              variant="soft"
              icon="i-lucide-circle-check"
            >
              current
            </UBadge>
          </div>

          <!-- Address -->
          <div class="mt-3 flex items-center gap-1.5">
            <UIcon name="i-lucide-shield" class="size-4 text-muted shrink-0" />
            <a
              :href="`https://polygonscan.com/address/${officer.address}`"
              target="_blank"
              rel="noopener noreferrer"
              class="font-mono text-sm text-primary hover:underline"
            >
              {{ shortenAddress(officer.address) }}
            </a>
            <UIcon name="i-lucide-external-link" class="size-3.5 text-dimmed" />
            <CopyButton :value="officer.address" label="Officer address copied" />
          </div>

          <!-- Deploy metadata -->
          <dl class="mt-3 flex flex-col gap-1.5 text-sm">
            <div v-if="officer.deployBlockNumber" class="flex items-center gap-2">
              <UIcon name="i-lucide-box" class="size-4 text-dimmed shrink-0" />
              <dt class="text-muted w-20 shrink-0">
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

            <div v-if="officer.deployedAt" class="flex items-center gap-2">
              <UIcon name="i-lucide-clock" class="size-4 text-dimmed shrink-0" />
              <dt class="text-muted w-20 shrink-0">
                Deployed
              </dt>
              <dd class="text-muted">
                {{ dayjs(officer.deployedAt).format('MMM D, YYYY HH:mm') }}
                <span class="text-dimmed">· {{ dayjs(officer.deployedAt).fromNow() }}</span>
              </dd>
            </div>

            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-radio-tower" class="size-4 text-dimmed shrink-0" />
              <dt class="text-muted w-20 shrink-0">
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
