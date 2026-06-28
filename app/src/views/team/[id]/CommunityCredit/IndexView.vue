<template>
  <div class="flex flex-col gap-6">
    <!-- Demo role control -->
    <div class="flex justify-end">
      <CreditRoleSwitcher />
    </div>

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
      <div class="flex flex-shrink-0 gap-2.5">
        <template v-if="store.isOwner">
          <UButton
            color="primary"
            variant="soft"
            icon="heroicons:adjustments-horizontal"
            label="Default rules"
            @click="toast.add({ title: 'Default rules — set who can lend across all rounds' })"
          />
          <UButton
            color="primary"
            icon="heroicons:plus"
            label="New credit call"
            data-test="new-credit-call"
            @click="goNew"
          />
        </template>
        <UButton
          v-else
          color="primary"
          icon="heroicons:hand-raised"
          label="Lend to a round"
          @click="toast.add({ title: 'Pick an open round below to lend' })"
        />
      </div>
    </div>

    <!-- Credit Account hero -->
    <CreditAccountHero />

    <!-- Open & active rounds -->
    <div>
      <div class="mb-3.5 flex items-center justify-between">
        <span class="text-[15px] font-bold tracking-tight">Open &amp; active rounds</span>
        <span class="text-muted text-xs">{{ activeLabel }}</span>
      </div>
      <div class="grid gap-5" style="grid-template-columns: repeat(auto-fill, minmax(360px, 1fr))">
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

    <!-- History & drafts -->
    <div>
      <div class="mb-3.5 flex items-center justify-between">
        <span class="text-[15px] font-bold tracking-tight">History &amp; drafts</span>
      </div>
      <CreditHistoryTable @select="onHistorySelect" @continue="goNew" />
    </div>

    <CreditLendModal :round="lendRound" @close="lendRound = null" @lend="confirmLend" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from '@nuxt/ui/composables'
import { useCommunityCreditStore } from '@/stores'
import { formatAmount } from '@/utils'
import type { CreditRound } from '@/types'
import CreditAccountHero from '@/components/sections/CommunityCreditView/CreditAccountHero.vue'
import CreditHistoryTable from '@/components/sections/CommunityCreditView/CreditHistoryTable.vue'
import CreditLendModal from '@/components/sections/CommunityCreditView/CreditLendModal.vue'
import CreditRoleSwitcher from '@/components/sections/CommunityCreditView/CreditRoleSwitcher.vue'
import CreditRoundCard from '@/components/sections/CommunityCreditView/CreditRoundCard.vue'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const store = useCommunityCreditStore()

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
  router.push({ name: 'community-credit-repay', params: { id: teamId.value, roundId } })
}
function onHistorySelect(round: CreditRound) {
  if (round.status === 'draft') goNew()
  else goRound(round.id)
}

function confirmLend(amount: number) {
  const round = lendRound.value
  if (!round) return
  const added = store.lend(round.id, amount)
  lendRound.value = null
  if (added > 0) {
    toast.add({
      title: `Credit signed — ${formatAmount(added, round.token)} sent`,
      color: 'success'
    })
  }
}
</script>
