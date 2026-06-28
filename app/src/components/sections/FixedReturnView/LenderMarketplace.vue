<template>
  <div class="flex flex-col gap-5">
    <!-- Header -->
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <div class="text-xl font-extrabold tracking-tight text-[#0f3d2e]">Available offerings</div>
        <div class="mt-1 text-sm text-[#7d8e84]">
          Fixed-return notes you're eligible to fund. Apply with an amount and submit.
        </div>
      </div>
      <div class="flex items-center gap-2 text-sm text-[#7d8e84]">
        <span class="bg-primary h-2 w-2 rounded-full"></span>
        {{ offerings.length }} open
      </div>
    </div>

    <!-- Loading state -->
    <UCard v-if="isLoading" data-test="marketplace-loading">
      <span class="sr-only">Loading offerings…</span>
      <div class="flex flex-col gap-4">
        <div class="flex items-start justify-between gap-3">
          <div class="flex flex-1 flex-col gap-2">
            <USkeleton class="h-5 w-2/3" />
            <USkeleton class="h-6 w-28 rounded-full" />
          </div>
          <USkeleton class="h-8 w-20" />
        </div>
        <div class="grid grid-cols-2 gap-2.5">
          <USkeleton v-for="index in 4" :key="index" class="h-16 rounded-xl" />
        </div>
        <USkeleton class="h-2 w-full rounded-full" />
        <USkeleton class="h-11 w-full rounded-xl" />
      </div>
    </UCard>

    <!-- Empty state -->
    <UEmpty
      v-else-if="offerings.length === 0"
      data-test="marketplace-empty"
      icon="heroicons:banknotes"
      title="No offerings available yet."
      description="Open fixed-return offerings will appear here."
    />

    <!-- Offering cards -->
    <div
      v-else
      class="grid gap-4"
      style="grid-template-columns: repeat(auto-fill, minmax(340px, 1fr))"
    >
      <UCard
        v-for="o in offerings"
        :key="o.id"
        data-test="marketplace-offering-card"
        class="transition-all hover:border-[#bfe3d2] hover:shadow-md"
        :ui="{ body: 'flex flex-col gap-4 p-5' }"
      >
        <!-- Title + rate -->
        <div class="flex items-start justify-between gap-3">
          <div class="flex flex-col gap-2">
            <div class="text-base leading-tight font-extrabold text-[#0f3d2e]">{{ o.title }}</div>
            <span
              class="inline-flex items-center gap-1.5 self-start rounded-full px-2.5 py-1 text-xs font-bold"
              :style="{ background: o.accessBg, color: o.accessColor }"
            >
              <span class="h-1.5 w-1.5 rounded-full" :style="{ background: o.accessDot }"></span>
              {{ o.accessLabel }}
            </span>
          </div>
          <div class="flex-none text-right">
            <div class="text-2xl leading-none font-extrabold tracking-tight text-[#00a86c]">
              {{ o.rate }}%
            </div>
            <div class="mt-0.5 text-xs font-semibold text-[#9aaba2]">fixed / yr</div>
          </div>
        </div>

        <!-- Info tiles -->
        <div class="grid grid-cols-2 gap-2.5">
          <div class="rounded-xl bg-[#f7faf8] px-3 py-2.5">
            <div class="text-xs font-semibold text-[#9aaba2]">Term</div>
            <div class="mt-0.5 text-sm font-bold text-[#0f3d2e]">
              {{ termLabel(o.term, o.termUnit) }}
            </div>
          </div>
          <div class="rounded-xl bg-[#f7faf8] px-3 py-2.5">
            <div class="text-xs font-semibold text-[#9aaba2]">Repayment</div>
            <div class="mt-0.5 text-sm font-bold text-[#0f3d2e]">Bullet</div>
          </div>
          <div class="rounded-xl bg-[#f7faf8] px-3 py-2.5">
            <div class="text-xs font-semibold text-[#9aaba2]">Loan amount</div>
            <div class="mt-0.5 text-sm font-bold text-[#0f3d2e]">{{ o.limitsLabel }}</div>
            <div v-if="o.myDeposited > 0" class="mt-0.5 text-xs font-semibold text-[#0a7a52]">
              Lent {{ formatOfferingTokenAmount(o.myDeposited, o.token) }}
            </div>
          </div>
          <div class="rounded-xl bg-[#f7faf8] px-3 py-2.5">
            <div class="text-xs font-semibold text-[#9aaba2]">Collateral</div>
            <div class="mt-0.5 text-sm font-bold text-[#0f3d2e]">None</div>
          </div>
        </div>

        <!-- Progress bar -->
        <div>
          <div class="mb-1.5 flex justify-between text-xs font-semibold">
            <span class="text-[#7d8e84]">
              Raised {{ formatOfferingTokenAmount(o.raised, o.token) }}
            </span>
            <span class="text-[#9aaba2]">
              of {{ formatOfferingTokenAmount(o.target, o.token) }} · {{ o.pct }}%
            </span>
          </div>
          <UProgress
            :model-value="o.pct"
            :max="100"
            size="sm"
            data-test="marketplace-funding-progress"
          />
        </div>

        <!-- Button -->
        <UButton
          block
          size="lg"
          color="primary"
          :variant="o.allowed ? 'solid' : 'soft'"
          :disabled="!o.allowed"
          :label="lenderCtaLabel(o)"
          data-test="marketplace-apply-button"
          @click="o.allowed && openApply(o)"
        />
      </UCard>
    </div>

    <!-- Apply modal -->
    <ApplyOfferingModal
      v-if="selected"
      v-model:open="applyModalOpen"
      :offer="selected"
      @after:leave="selected = null"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import ApplyOfferingModal from './ApplyOfferingModal.vue'
import { useTeamStore } from '@/stores'
import {
  useFixedReturnAllOffers,
  useFixedReturnMyLenderPositions
} from '@/composables/fixedReturn/reads'
import { useGetFixedReturnOfferingsQuery } from '@/queries'
import {
  formatOfferingTokenAmount,
  isLendingOfferAcceptingFunds,
  lenderCtaLabel,
  termLabel,
  toLenderOffering
} from '@/utils'
import type { LenderOffering } from '@/types'

const teamStore = useTeamStore()

const { data: rawOfferings, isLoading } = useFixedReturnAllOffers()
const { data: offeringMetadata } = useGetFixedReturnOfferingsQuery({
  queryParams: { teamId: teamStore.currentTeamId }
})

// Match lendFunds' state and deadline guards so an expired offer cannot remain
// actionable while it is still on-chain Open and waiting to be marked Refundable.
const openOffers = computed(() =>
  (rawOfferings.value ?? []).filter(({ offer }) => isLendingOfferAcceptingFunds(offer))
)

const { data: myLenderPositions } = useFixedReturnMyLenderPositions()

const offerings = computed<LenderOffering[]>(() => {
  const metadataByOfferId = new Map(offeringMetadata.value?.map((m) => [m.offerId, m.title]))
  const positions = myLenderPositions.value ?? new Map()
  return openOffers.value.map(({ offerId, offer, decimals }) => {
    const position = positions.get(offerId) ?? { allocation: 0n, deposited: 0n }
    return toLenderOffering(
      offerId,
      offer,
      decimals,
      position.allocation,
      position.deposited,
      metadataByOfferId.get(offerId)
    )
  })
})

const selected = ref<LenderOffering | null>(null)
const applyModalOpen = ref(false)

function openApply(o: LenderOffering) {
  selected.value = o
  applyModalOpen.value = true
}
</script>
