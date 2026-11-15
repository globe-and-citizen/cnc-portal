<script setup lang="ts">
import { computed } from 'vue'
import { useContractLogsQuery } from '~/queries/contractLogs.query'
import { shortenAddress } from '~/utils/generalUtil'

const props = defineProps<{
  address: string
  type?: string
}>()

const { data: logs, isLoading, isError, isFetchNextPageError, isFetchingNextPage, hasNextPage, fetchNextPage, refetch }
  = useContractLogsQuery(() => props.address)
const chainId = Number(useRuntimeConfig().public.chainId)

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

const pages = computed(() => logs.value?.pages ?? [])
const lastPage = computed(() => pages.value.at(-1))
const rows = computed(() => {
  const seen = new Set<string>()
  return pages.value.flatMap(page => page.rows).filter((log) => {
    if (log.transactionHash === null || log.logIndex === null) return true
    const id = `${log.transactionHash.toLowerCase()}-${log.logIndex}`
    if (seen.has(id)) return false
    seen.add(id)
    return true
  })
})
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="flex items-center gap-2">
      <UIcon name="i-lucide-scroll-text" class="size-5 text-muted" />
      <h3 class="text-base font-semibold text-highlighted">
        Logs<span v-if="type" class="text-muted font-normal"> · {{ type }}</span>
      </h3>
      <UBadge
        v-if="!isLoading && !isError"
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

    <div v-else-if="isError && !logs" class="space-y-2 text-sm text-error">
      <p>Failed to load contract logs.</p>
      <UButton size="xs" color="neutral" @click="refetch()">
        Retry
      </UButton>
    </div>

    <p v-else-if="!logs" class="text-sm text-muted">
      Contract logs are not available yet.
    </p>

    <template v-else>
      <UAlert
        v-if="lastPage?.failed || isError"
        color="error"
        title="Some history could not be loaded"
        description="Previously loaded events are preserved. Retry the remaining range."
      />
      <UAlert
        v-else-if="hasNextPage"
        color="warning"
        title="History is incomplete"
        description="Older blocks have not been scanned yet."
      />
      <p v-if="rows.length === 0" class="text-sm text-muted">
        {{ hasNextPage ? 'No events found in the scanned blocks.' : 'No events found in the scanned history.' }}
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
            <tr v-for="(log, index) in rows" :key="`${log.transactionHash ?? 'unknown'}-${log.logIndex === null ? `missing-${index}` : log.logIndex}`" class="border-b border-default/60">
              <td class="py-1.5 pr-3 align-top">
                <UBadge color="primary" variant="subtle" size="sm">
                  {{ log.eventName }}
                </UBadge>
              </td>
              <td class="py-1.5 pr-3 align-top font-mono text-xs text-muted max-w-md break-all">
                {{ formatArgs(log.args) }}
              </td>
              <td class="py-1.5 pr-3 align-top font-mono text-xs text-muted whitespace-nowrap">
                {{ log.blockNumber === null ? 'Unknown' : `#${log.blockNumber.toString()}` }}
              </td>
              <td class="py-1.5 align-top">
                <a
                  v-if="chainId === 137 && log.transactionHash"
                  :href="`https://polygonscan.com/tx/${log.transactionHash}`"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="font-mono text-xs text-primary hover:underline inline-flex items-center gap-1"
                >
                  {{ shortenAddress(log.transactionHash) }}
                  <UIcon name="i-lucide-external-link" class="size-3" />
                </a>
                <span v-else class="font-mono text-xs text-muted">{{ log.transactionHash ? shortenAddress(log.transactionHash) : 'Unknown' }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <UButton
        v-if="hasNextPage || isError"
        size="xs"
        color="neutral"
        :loading="isFetchingNextPage"
        :disabled="isFetchingNextPage"
        @click="isError && !isFetchNextPageError ? refetch() : fetchNextPage()"
      >
        {{ lastPage?.failed || isError ? 'Retry remaining history' : 'Load older logs' }}
      </UButton>
    </template>
  </div>
</template>
