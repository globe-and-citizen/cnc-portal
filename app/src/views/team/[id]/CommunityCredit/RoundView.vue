<template>
  <div v-if="round" class="flex flex-col gap-4.5">
    <!-- Back -->
    <button
      type="button"
      class="text-muted hover:text-default flex cursor-pointer items-center gap-2 text-sm"
      @click="goList"
    >
      <UIcon name="heroicons:arrow-left" class="size-4" />
      All rounds
    </button>

    <!-- Header -->
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div class="min-w-0">
        <div class="flex flex-wrap items-center gap-2.5">
          <h1 class="text-2xl font-bold tracking-tight">{{ round.name }}</h1>
          <UBadge :color="status.color" variant="subtle" :label="status.label" size="lg" />
          <span
            class="border-default bg-muted inline-flex items-center gap-1.5 rounded-full border py-1 pr-2.5 pl-1.5 text-xs font-semibold"
          >
            <span
              class="bg-primary/15 text-primary flex h-4 w-4 items-center justify-center rounded-full text-[8px] font-bold"
            >
              $
            </span>
            {{ round.token }}
          </span>
        </div>
        <p class="text-muted mt-1.5 max-w-2xl text-sm leading-relaxed">{{ round.desc }}</p>
      </div>
      <div class="flex items-center gap-2.5">
        <CreditRoleSwitcher />
        <UButton
          v-for="action in ctas"
          :key="action.test"
          :color="action.color"
          :variant="action.variant"
          :icon="action.icon"
          :label="action.label"
          :data-test="action.test"
          @click="action.run"
        />
      </div>
    </div>

    <!-- Layout explorer -->
    <CreditLayoutSwitcher />

    <!-- Active variant -->
    <CreditRoundLedger v-if="store.variant === 'ledger'" :round="round" />
    <CreditRoundGauge v-else-if="store.variant === 'gauge'" :round="round" />
    <CreditRoundTimeline v-else :round="round" />

    <CreditLendModal :round="lendRound" @close="lendRound = null" @lend="confirmLend" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from '@nuxt/ui/composables'
import { useCommunityCreditStore } from '@/stores'
import { formatAmount, statusMeta } from '@/utils'
import type { CreditRound } from '@/types'
import CreditLayoutSwitcher from '@/components/sections/CommunityCreditView/CreditLayoutSwitcher.vue'
import CreditLendModal from '@/components/sections/CommunityCreditView/CreditLendModal.vue'
import CreditRoleSwitcher from '@/components/sections/CommunityCreditView/CreditRoleSwitcher.vue'
import CreditRoundGauge from '@/components/sections/CommunityCreditView/CreditRoundGauge.vue'
import CreditRoundLedger from '@/components/sections/CommunityCreditView/CreditRoundLedger.vue'
import CreditRoundTimeline from '@/components/sections/CommunityCreditView/CreditRoundTimeline.vue'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const store = useCommunityCreditStore()

const teamId = computed(() => String(route.params.id))
const round = computed(() => store.getRound(String(route.params.roundId)))
const status = computed(() => statusMeta(round.value?.status ?? 'open'))
const lendRound = ref<CreditRound | null>(null)

function goList() {
  router.push({ name: 'community-credit', params: { id: teamId.value } })
}

// Redirect away if the round id is unknown (e.g. a draft that has no detail page).
watch(
  round,
  (value) => {
    if (!value) goList()
  },
  { immediate: true }
)

type Cta = {
  test: string
  label: string
  icon: string
  color: 'primary' | 'neutral'
  variant: 'solid' | 'soft'
  run: () => void
}

const ctas = computed<Cta[]>(() => {
  const r = round.value
  if (!r) return []
  const list: Cta[] = []

  // Anyone can lend to an open round — the owner is a member too.
  if (r.status === 'open') {
    list.push({
      test: 'round-cta-lend',
      label: 'Lend now',
      icon: 'heroicons:hand-raised',
      color: 'primary',
      variant: 'solid',
      run: () => (lendRound.value = r)
    })
  }

  if (store.isOwner) {
    // Owner management actions, alongside the lend action above.
    if (r.status === 'active' || r.status === 'funded') {
      list.push({
        test: 'round-cta-repay',
        label: 'Repay round',
        icon: 'heroicons:arrow-uturn-left',
        color: 'primary',
        variant: 'solid',
        run: () =>
          router.push({
            name: 'community-credit-repay',
            params: { id: teamId.value, roundId: r.id }
          })
      })
    } else if (r.status === 'open') {
      list.push({
        test: 'round-cta-edit',
        label: 'Edit terms',
        icon: 'heroicons:pencil-square',
        color: 'primary',
        variant: 'soft',
        run: () => toast.add({ title: 'Edit terms — opens while the round is open' })
      })
    }
  } else if (r.status !== 'draft' && r.status !== 'open') {
    // A plain lender can review their receipt on a closed round.
    list.push({
      test: 'round-cta-receipt',
      label: 'View receipt',
      icon: 'heroicons:document-text',
      color: 'primary',
      variant: 'soft',
      run: () => toast.add({ title: 'Your signed lending receipt' })
    })
  }

  return list
})

function confirmLend(amount: number) {
  const r = round.value
  if (!r) return
  const added = store.lend(r.id, amount)
  lendRound.value = null
  if (added > 0) {
    toast.add({ title: `Credit signed — ${formatAmount(added, r.token)} sent`, color: 'success' })
  }
}
</script>
