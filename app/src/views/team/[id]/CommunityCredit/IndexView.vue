<template>
  <div class="flex flex-col gap-6">
    <!-- Header -->
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <div class="flex items-center gap-2.5">
          <h1 class="text-2xl font-bold tracking-tight">Community Credit</h1>
          <UBadge color="primary" variant="subtle" label="Credit Account" size="lg" />
        </div>
        <p class="text-muted mt-1.5 max-w-xl text-sm leading-relaxed">
          Raise working capital from your members. Each round is repaid in full with fixed interest
          at maturity — signed on-chain from the dedicated Credit Account.
        </p>
      </div>
      <div v-if="store.hasContract" class="flex flex-shrink-0 gap-2.5">
        <UButton
          v-if="store.isOwner"
          color="primary"
          icon="heroicons:plus"
          label="New credit call"
          data-test="new-credit-call"
          @click="goNew"
        />
        <UButton
          v-else
          color="primary"
          icon="heroicons:hand-raised"
          label="Lend to a round"
          data-test="lend-hint-button"
          @click="showLendHint"
        />
      </div>
    </div>

    <!-- No Credit Account deployed for this team -->
    <div
      v-if="!store.hasContract"
      class="border-default text-muted flex flex-col items-center gap-2 rounded-2xl border border-dashed py-16 text-center"
      data-test="credit-no-contract"
    >
      <UIcon name="heroicons:building-library" class="text-dimmed size-8" />
      <p class="text-sm font-semibold">No Credit Account for this team yet</p>
      <p class="max-w-sm text-xs">
        A FixedReturn contract has to be deployed for this team before credit rounds can be raised.
      </p>
    </div>

    <template v-else>
      <!-- Contract balance -->
      <CreditBalanceSection />

      <!-- Credit Account hero -->
      <CreditAccountHero />

      <!-- Open & active rounds -->
      <div>
        <div class="mb-3.5 flex items-center justify-between">
          <span class="text-[15px] font-bold tracking-tight">Open &amp; active rounds</span>
          <span class="text-muted text-xs">{{ activeLabel }}</span>
        </div>

        <div
          v-if="store.isLoading"
          class="grid gap-5"
          style="grid-template-columns: repeat(auto-fill, minmax(360px, 1fr))"
          data-test="credit-rounds-loading"
        >
          <USkeleton v-for="n in 3" :key="n" class="h-56 rounded-2xl" />
        </div>

        <UAlert
          v-else-if="store.isError"
          color="error"
          variant="soft"
          icon="i-lucide-circle-alert"
          title="Couldn't load credit rounds"
          description="Reading the FixedReturn contract failed. Please retry in a moment."
          data-test="credit-rounds-error"
        />

        <div
          v-else-if="!store.activeRounds.length"
          class="border-default text-muted rounded-2xl border border-dashed py-12 text-center text-sm"
          data-test="credit-rounds-empty"
        >
          No open or active rounds right now.
        </div>

        <div
          v-else
          class="grid gap-5"
          style="grid-template-columns: repeat(auto-fill, minmax(360px, 1fr))"
        >
          <CreditRoundCard
            v-for="round in store.activeRounds"
            :key="round.id"
            :round="round"
            @open="goRound(round.id)"
            @lend="lendRound = round"
            @repay="goRepay(round.id)"
          />
        </div>
      </div>

      <!-- History -->
      <div v-if="store.historyRounds.length">
        <div class="mb-3.5 flex items-center justify-between">
          <span class="text-[15px] font-bold tracking-tight">History</span>
        </div>
        <CreditHistoryTable @select="onHistorySelect" />
      </div>

      <!-- On-chain transaction history -->
      <CreditAccountTransactions
        v-if="fixedReturnAddress"
        :fixed-return-address="fixedReturnAddress"
      />
    </template>

    <CreditLendModal :round="lendRound" @close="lendRound = null" @lent="lendRound = null" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from '@nuxt/ui/composables'
import { useCommunityCreditStore } from '@/stores'
import type { CreditRound } from '@/types'
import { useFixedReturnAddress } from '@/composables/fixedReturn/reads'
import CreditAccountHero from '@/components/sections/CommunityCreditView/CreditAccountHero.vue'
import CreditHistoryTable from '@/components/sections/CommunityCreditView/CreditHistoryTable.vue'
import CreditLendModal from '@/components/sections/CommunityCreditView/CreditLendModal.vue'
import CreditRoundCard from '@/components/sections/CommunityCreditView/CreditRoundCard.vue'
import CreditBalanceSection from '@/components/sections/CommunityCreditView/CreditBalanceSection.vue'
import CreditAccountTransactions from '@/components/sections/CommunityCreditView/CreditAccountTransactions.vue'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const store = useCommunityCreditStore()
const fixedReturnAddress = useFixedReturnAddress()

const teamId = computed(() => String(route.params.id))
const lendRound = ref<CreditRound | null>(null)

const activeLabel = computed(() => {
  const n = store.activeRounds.length
  return `${n} ${n === 1 ? 'round' : 'rounds'}`
})

function goNew() {
  router.push({ name: 'community-credit-new', params: { id: teamId.value } })
}
function goRound(roundId: string) {
  router.push({ name: 'community-credit-round', params: { id: teamId.value, roundId } })
}
function goRepay(roundId: string) {
  // Same behavior as the round page's own "Repay round" button — switch to the inline
  // Repay layout variant rather than a separate route.
  store.setVariant('repay')
  goRound(roundId)
}
function onHistorySelect(round: CreditRound) {
  goRound(round.id)
}
function showLendHint() {
  toast.add({ title: 'Pick an open round below to lend' })
}
</script>
