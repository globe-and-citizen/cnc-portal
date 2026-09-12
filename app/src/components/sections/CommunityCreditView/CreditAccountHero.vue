<template>
  <div class="relative overflow-hidden rounded-2xl bg-[#0f3d2e] px-8 py-7" data-test="credit-hero">
    <div class="absolute -top-12 -right-12 h-60 w-60 rounded-full bg-[#00bf7a]/12"></div>

    <div class="relative grid items-center gap-11 lg:grid-cols-[1.15fr_1fr]">
      <!-- Headline figure(s) — one block per token in play; almost always just one. -->
      <div>
        <div
          v-for="(entry, index) in headlineTokens"
          :key="entry.token"
          :class="index > 0 ? 'mt-4' : ''"
        >
          <div class="text-sm font-medium text-white/65">
            Credit Account · Outstanding principal<span v-if="headlineTokens.length > 1">
              ({{ entry.token }})</span
            >
          </div>
          <div
            class="font-extrabold tracking-tight text-white"
            :class="
              headlineTokens.length > 1
                ? 'mt-1 text-[32px] leading-tight'
                : 'mt-1.5 text-[46px] leading-tight'
            "
          >
            {{ formatAmount(entry.outstanding, entry.token) }}
          </div>
          <div class="mt-1.5 font-mono text-sm text-[#7fd9b6]">
            + {{ formatAmount(entry.interest, entry.token) }} interest due at maturity
          </div>
        </div>
        <div class="mt-4 flex flex-wrap gap-2.5">
          <span
            v-for="chip in chips"
            :key="chip.text"
            class="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/90"
          >
            <UIcon :name="chip.icon" class="size-3.5" />
            {{ chip.text }}
          </span>
        </div>
      </div>

      <!-- Stat tiles -->
      <div class="grid grid-cols-2 gap-3">
        <div
          v-for="card in cards"
          :key="card.label"
          class="rounded-xl border border-white/12 bg-white/[0.07] px-4 py-3.5"
        >
          <div class="text-[11px] font-medium text-white/60">{{ card.label }}</div>
          <div class="mt-1 text-lg font-bold text-white">{{ card.value }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useCommunityCreditStore } from '@/stores'
import { formatAmount } from '@/utils/communityCredit/model'

const store = useCommunityCreditStore()

// Every token that actually appears in the account's stats, dominant (by outstanding
// principal) first. Rounds aren't necessarily all the same ERC-20, so each token gets
// its own headline/line rather than being silently summed into one meaningless number.
const tokens = computed(() => {
  const seen = new Set<string>()
  for (const byToken of [
    store.outstandingPrincipalByToken,
    store.raisedLifetimeByToken,
    store.interestDueByToken,
    store.repaidLifetimeByToken
  ]) {
    for (const token of byToken.keys()) seen.add(token)
  }
  return [...seen].sort(
    (a, b) =>
      (store.outstandingPrincipalByToken.get(b) ?? 0) -
      (store.outstandingPrincipalByToken.get(a) ?? 0)
  )
})
// Falls back to a single USDC entry when there's no activity yet, so the hero still
// renders its usual "0 USDC" headline instead of collapsing to nothing.
const displayTokens = computed(() => (tokens.value.length > 0 ? tokens.value : ['USDC']))

const headlineTokens = computed(() =>
  displayTokens.value.map((token) => ({
    token,
    outstanding: store.outstandingPrincipalByToken.get(token) ?? 0,
    interest: store.interestDueByToken.get(token) ?? 0
  }))
)

const chips = computed(() => [
  {
    icon: 'heroicons:bolt',
    text: `${store.activeRounds.length} rounds raising or in repayment`
  },
  { icon: 'heroicons:check-circle', text: `${store.historyRounds.length} settled` }
])

function formatAmountsByToken(byToken: Map<string, number>): string {
  return displayTokens.value
    .map((token) => formatAmount(byToken.get(token) ?? 0, token))
    .join(' + ')
}

const cards = computed(() => [
  { label: 'Raised lifetime', value: formatAmountsByToken(store.raisedLifetimeByToken) },
  { label: 'Repaid lifetime', value: formatAmountsByToken(store.repaidLifetimeByToken) },
  { label: 'Active rounds', value: String(store.activeRounds.length) },
  { label: 'Next maturity', value: store.nextMaturity }
])
</script>
