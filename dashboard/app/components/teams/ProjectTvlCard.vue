<script setup lang="ts">
import { computed } from 'vue'
import { formatEther, formatUnits } from 'viem'
import type { ProjectTvl } from '~/composables/useTeamsBalanceRecaps'

const props = defineProps<{
  tvl: ProjectTvl
}>()

const fmt = (value: number, digits = 2) =>
  value.toLocaleString(undefined, { maximumFractionDigits: digits })

// Stablecoin TVL ≈ USD (all tracked stablecoins are ~1 USD).
const stableUsd = computed(() => fmt(props.tvl.stableValue))

const tokenLines = computed(() =>
  props.tvl.tokens
    .filter(t => t.raw > 0n)
    .map(t => ({ symbol: t.symbol, amount: fmt(Number(formatUnits(t.raw, t.decimals))) }))
)

const nativeAmount = computed(() => fmt(Number(formatEther(props.tvl.native)), 4))
const hasNative = computed(() => props.tvl.native > 0n)
</script>

<template>
  <div class="rounded-xl border border-default bg-elevated/30 p-4">
    <div class="flex items-center gap-2 mb-3">
      <UIcon name="i-lucide-landmark" class="size-4 text-muted" />
      <h3 class="text-sm font-semibold text-highlighted">
        Total Value Locked
      </h3>
      <UIcon
        v-if="tvl.loading"
        name="i-lucide-loader-circle"
        class="size-3.5 text-muted animate-spin"
      />
    </div>

    <div class="flex flex-wrap items-end gap-x-8 gap-y-3">
      <!-- Headline stablecoin TVL (≈ USD) -->
      <div>
        <p class="text-3xl font-semibold text-highlighted tabular-nums">
          ${{ stableUsd }}
        </p>
        <p class="text-xs text-muted mt-0.5">
          across stablecoins (USDC · USDC.e · USDT)
        </p>
      </div>

      <!-- Per-asset breakdown -->
      <div class="flex flex-wrap gap-2">
        <UBadge
          v-for="line in tokenLines"
          :key="line.symbol"
          color="primary"
          variant="subtle"
          size="lg"
          class="font-mono tabular-nums"
        >
          {{ line.amount }} {{ line.symbol }}
        </UBadge>
        <UBadge
          v-if="hasNative"
          color="neutral"
          variant="subtle"
          size="lg"
          class="font-mono tabular-nums"
        >
          {{ nativeAmount }} POL
        </UBadge>
        <span
          v-if="tokenLines.length === 0 && !hasNative && !tvl.loading"
          class="text-sm text-muted"
        >
          No funds held.
        </span>
      </div>
    </div>

    <p class="mt-3 text-xs text-dimmed">
      Native POL is shown separately (not priced into the USD total).
    </p>
  </div>
</template>
