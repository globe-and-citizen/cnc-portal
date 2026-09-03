<script setup lang="ts">
import { computed } from 'vue'
import type { Address } from 'viem'
import type { TvlStats } from '~/types'
import type { TokenPriceResolver } from '~/utils/tvl'

const props = defineProps<{
  data: TvlStats | null | undefined
  isLoading: boolean
}>()

const tokenPriceStore = useTokenPriceStore()

// Adapts the store's price lookup to the resolver the valuation util expects.
const priceOf: TokenPriceResolver = token =>
  tokenPriceStore.getTokenPrice({ symbol: token.symbol, address: token.address as Address })

const globalTvlUsd = computed(() =>
  props.data ? valueRawAmounts(props.data.totals.tvlRaw, props.data.tokens, priceOf) : 0
)

const totalTransferredUsd = computed(() =>
  props.data ? valueRawAmounts(props.data.totals.transferredRaw, props.data.tokens, priceOf) : 0
)

// Per-token USD breakdown of the global TVL, biggest first, zero buckets dropped.
const tokenBreakdown = computed(() => {
  if (!props.data) return []
  return props.data.tokens
    .map(token => ({
      symbol: token.symbol,
      usd: valueRawAmount(props.data!.totals.tvlRaw[token.key], token, priceOf)
    }))
    .filter(entry => entry.usd > 0)
    .sort((a, b) => b.usd - a.usd)
})

const transferredAvailable = computed(() => props.data?.transferredAvailable ?? false)

interface TeamRow {
  teamId: number
  name: string
  bankCount: number
  tvlUsd: number
  transferredUsd: number
  formattedTvl: string
  formattedTransferred: string
}

const teamRows = computed<TeamRow[]>(() => {
  if (!props.data) return []
  const tokens = props.data.tokens
  return props.data.teams
    .map((team) => {
      const tvlUsd = valueRawAmounts(team.tvlRaw, tokens, priceOf)
      const transferredUsd = valueRawAmounts(team.transferredRaw, tokens, priceOf)
      return {
        teamId: team.teamId,
        name: team.name,
        bankCount: team.bankAddresses.length,
        tvlUsd,
        transferredUsd,
        formattedTvl: formatUSD(tvlUsd),
        formattedTransferred: transferredAvailable.value ? formatUSD(transferredUsd) : '—'
      }
    })
    .sort((a, b) => b.tvlUsd - a.tvlUsd)
})

const columns = [
  { accessorKey: 'name', header: 'Team' },
  { accessorKey: 'formattedTvl', header: 'TVL (USD)' },
  { accessorKey: 'formattedTransferred', header: 'Transferred (USD)' }
]
</script>

<template>
  <div class="space-y-6">
    <!-- Headline cards -->
    <UPageGrid class="lg:grid-cols-2">
      <UPageCard
        icon="i-lucide-lock"
        title="Total Value Locked"
        variant="subtle"
        :ui="{
          container: 'gap-y-2',
          leading: 'p-2.5 rounded-full bg-primary/10 ring ring-inset ring-primary/25'
        }"
      >
        <template v-if="isLoading">
          <USkeleton class="h-8 w-32" />
        </template>
        <template v-else-if="data">
          <span class="text-2xl font-semibold text-highlighted">
            {{ formatUSD(globalTvlUsd) }}
          </span>
          <div v-if="tokenBreakdown.length" class="flex flex-wrap gap-2 mt-1">
            <UBadge
              v-for="entry in tokenBreakdown"
              :key="entry.symbol"
              color="neutral"
              variant="subtle"
              class="text-xs"
            >
              {{ entry.symbol }} · {{ formatUSD(entry.usd) }}
            </UBadge>
          </div>
        </template>
      </UPageCard>

      <UPageCard
        icon="i-lucide-arrow-left-right"
        title="Total Transferred"
        variant="subtle"
        :ui="{
          container: 'gap-y-2',
          leading: 'p-2.5 rounded-full bg-primary/10 ring ring-inset ring-primary/25'
        }"
      >
        <template v-if="isLoading">
          <USkeleton class="h-8 w-32" />
        </template>
        <template v-else-if="data">
          <span class="text-2xl font-semibold text-highlighted">
            {{ transferredAvailable ? formatUSD(totalTransferredUsd) : '—' }}
          </span>
          <p v-if="!transferredAvailable" class="text-xs text-muted mt-1">
            Transfer volume is unavailable (indexer not reachable).
          </p>
        </template>
      </UPageCard>
    </UPageGrid>

    <!-- Per-team breakdown -->
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold">
            TVL by Team
          </h3>
          <UBadge color="neutral" variant="subtle">
            {{ teamRows.length }} teams
          </UBadge>
        </div>
      </template>

      <UTable :data="teamRows" :columns="columns" :loading="isLoading">
        <template #empty>
          <div class="flex flex-col items-center justify-center py-8">
            <UIcon name="i-lucide-vault" class="w-12 h-12 text-muted mb-3" />
            <p class="text-muted">
              No team treasuries found
            </p>
          </div>
        </template>

        <template #name-cell="{ row }">
          <div class="flex flex-col">
            <span class="font-medium text-highlighted">{{ row.original.name }}</span>
            <span class="text-xs text-muted">
              {{ row.original.bankCount }} {{ row.original.bankCount === 1 ? 'treasury' : 'treasuries' }}
            </span>
          </div>
        </template>

        <template #formattedTvl-cell="{ row }">
          <span class="font-medium whitespace-nowrap">{{ row.original.formattedTvl }}</span>
        </template>

        <template #formattedTransferred-cell="{ row }">
          <span class="whitespace-nowrap text-muted">{{ row.original.formattedTransferred }}</span>
        </template>
      </UTable>
    </UCard>
  </div>
</template>
