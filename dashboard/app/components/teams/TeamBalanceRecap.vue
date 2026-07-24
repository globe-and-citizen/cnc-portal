<script setup lang="ts">
import { computed } from 'vue'
import {
  formatNative,
  formatToken,
  type TeamBalanceBreakdown,
  type ContractBalance
} from '~/composables/useTeamsBalanceRecaps'

const props = defineProps<{
  recap: TeamBalanceBreakdown
}>()

// Non-zero balance lines for a single contract (empty ⇒ render an explicit 0).
const lines = (contract: ContractBalance) => [
  ...(contract.native > 0n ? [{ amount: formatNative(contract.native), symbol: 'POL' }] : []),
  ...contract.tokens.filter(t => t.raw > 0n).map(t => ({ amount: formatToken(t), symbol: t.symbol }))
]

const generations = computed(() => props.recap.generations)
const shared = computed(() => props.recap.shared)
const isEmpty = computed(() => generations.value.length === 0 && shared.value.length === 0)
</script>

<template>
  <USkeleton v-if="recap.loading" class="h-4 w-32" />
  <span v-else-if="isEmpty" class="text-sm text-dimmed">—</span>

  <div v-else class="flex flex-col gap-2.5">
    <!-- One block per Officer version generation. -->
    <div
      v-for="gen in generations"
      :key="gen.officerId"
      class="rounded-lg border px-2.5 py-2"
      :class="gen.isCurrent ? 'border-primary/40 bg-primary/5' : 'border-default bg-elevated'"
    >
      <div class="mb-1.5 flex items-center gap-1.5">
        <UBadge
          :color="gen.isCurrent ? 'primary' : 'neutral'"
          variant="subtle"
          size="sm"
          class="font-semibold"
        >
          {{ gen.version || 'unknown' }}
        </UBadge>
        <UBadge
          v-if="gen.isCurrent"
          color="success"
          variant="soft"
          size="sm"
        >
          current
        </UBadge>
      </div>

      <dl class="flex flex-col gap-1">
        <div
          v-for="contract in gen.contracts"
          :key="contract.address"
          class="flex items-baseline justify-between gap-3"
        >
          <dt class="text-xs text-muted truncate">
            {{ contract.type }}
          </dt>
          <dd class="font-mono text-sm tabular-nums text-right whitespace-nowrap">
            <template v-if="lines(contract).length">
              <span v-for="(line, i) in lines(contract)" :key="line.symbol">
                <span v-if="i > 0" class="text-dimmed"> · </span>{{ line.amount }}
                <span class="text-dimmed">{{ line.symbol }}</span>
              </span>
            </template>
            <span v-else class="text-dimmed">0</span>
          </dd>
        </div>
      </dl>
    </div>

    <!-- Version-independent contracts (Safe): survive Officer redeploys. -->
    <div
      v-if="shared.length"
      class="rounded-lg border border-default bg-elevated px-2.5 py-2"
    >
      <div class="mb-1.5 flex items-center gap-1.5">
        <UIcon name="i-lucide-link" class="size-3.5 text-muted" />
        <span class="text-xs font-semibold text-muted">Shared</span>
      </div>
      <dl class="flex flex-col gap-1">
        <div
          v-for="contract in shared"
          :key="contract.address"
          class="flex items-baseline justify-between gap-3"
        >
          <dt class="text-xs text-muted truncate">
            {{ contract.type }}
          </dt>
          <dd class="font-mono text-sm tabular-nums text-right whitespace-nowrap">
            <template v-if="lines(contract).length">
              <span v-for="(line, i) in lines(contract)" :key="line.symbol">
                <span v-if="i > 0" class="text-dimmed"> · </span>{{ line.amount }}
                <span class="text-dimmed">{{ line.symbol }}</span>
              </span>
            </template>
            <span v-else class="text-dimmed">0</span>
          </dd>
        </div>
      </dl>
    </div>
  </div>
</template>
