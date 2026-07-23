<script setup lang="ts">
import { computed } from 'vue'
import { useContractLogsQuery, type DecodedLog } from '~/queries/contractLogs.query'
import { shortenAddress } from '~/utils/generalUtil'

const props = defineProps<{
  address: string
  type?: string
}>()

const { data: logs, isLoading, isError } = useContractLogsQuery(() => props.address)

// Compact one-line summary of a log's decoded args.
const formatArgs = (args: Record<string, unknown>) => {
  const parts: string[] = []
  for (const [key, value] of Object.entries(args)) {
    let str: string
    if (typeof value === 'bigint') str = value.toString()
    else if (typeof value === 'string' && value.startsWith('0x') && value.length === 42)
      str = shortenAddress(value)
    else str = String(value)
    parts.push(`${key}: ${str}`)
  }
  return parts.join(', ')
}

const rows = computed(() => logs.value ?? [])
const key = (log: DecodedLog) => `${log.transactionHash}-${log.logIndex}`
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="flex items-center gap-2">
      <UIcon name="i-lucide-scroll-text" class="size-5 text-muted" />
      <h3 class="text-base font-semibold text-highlighted">
        Logs<span v-if="type" class="text-muted font-normal"> · {{ type }}</span>
      </h3>
      <UBadge
        v-if="!isLoading"
        color="neutral"
        variant="subtle"
        size="sm"
      >
        {{ rows.length }}
      </UBadge>
    </div>

    <div v-if="isLoading" class="flex flex-col gap-2">
      <USkeleton v-for="i in 4" :key="i" class="h-6 w-full" />
    </div>

    <div v-else-if="isError" class="flex items-center gap-1.5 text-sm text-error">
      <UIcon name="i-lucide-triangle-alert" class="size-4" />
      Failed to load logs (the RPC may cap the block range).
    </div>

    <p v-else-if="rows.length === 0" class="text-sm text-muted">
      No events emitted by this contract.
    </p>

    <div v-else class="overflow-x-auto max-h-[60vh]">
      <table class="w-full text-sm">
        <thead class="text-muted text-left sticky top-0 bg-default">
          <tr class="border-b border-default">
            <th class="py-1.5 pr-3 font-medium">
              Event
            </th>
            <th class="py-1.5 pr-3 font-medium">
              Args
            </th>
            <th class="py-1.5 pr-3 font-medium">
              Block
            </th>
            <th class="py-1.5 font-medium">
              Tx
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="log in rows" :key="key(log)" class="border-b border-default/60">
            <td class="py-1.5 pr-3 align-top">
              <UBadge color="primary" variant="subtle" size="sm">
                {{ log.eventName }}
              </UBadge>
            </td>
            <td class="py-1.5 pr-3 align-top font-mono text-xs text-muted max-w-md break-all">
              {{ formatArgs(log.args) }}
            </td>
            <td class="py-1.5 pr-3 align-top font-mono text-xs text-muted whitespace-nowrap">
              #{{ log.blockNumber.toString() }}
            </td>
            <td class="py-1.5 align-top">
              <a
                :href="`https://polygonscan.com/tx/${log.transactionHash}`"
                target="_blank"
                rel="noopener noreferrer"
                class="font-mono text-xs text-primary hover:underline inline-flex items-center gap-1"
              >
                {{ shortenAddress(log.transactionHash) }}
                <UIcon name="i-lucide-external-link" class="size-3" />
              </a>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
