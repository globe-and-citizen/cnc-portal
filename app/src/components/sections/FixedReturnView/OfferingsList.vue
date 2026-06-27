<template>
  <UCard :ui="{ body: 'p-0' }">
    <template #header>
      <div class="text-base font-extrabold text-[#0f3d2e]">
        Offerings <span class="text-sm font-semibold text-[#9aaba2]">· {{ offerings.length }}</span>
      </div>
    </template>
    <div class="overflow-x-auto">
      <table class="w-full border-collapse" style="min-width: 820px">
        <thead>
          <tr class="bg-[#f7faf8]">
            <th
              class="px-5 py-3 text-left text-xs font-bold tracking-wide text-[#81948a] uppercase"
            >
              Offering
            </th>
            <th
              class="px-4 py-3 text-right text-xs font-bold tracking-wide text-[#81948a] uppercase"
            >
              Rate
            </th>
            <th
              class="px-4 py-3 text-right text-xs font-bold tracking-wide text-[#81948a] uppercase"
            >
              Term
            </th>
            <th
              class="px-4 py-3 text-left text-xs font-bold tracking-wide text-[#81948a] uppercase"
            >
              Access
            </th>
            <th
              class="px-4 py-3 text-left text-xs font-bold tracking-wide text-[#81948a] uppercase"
              style="min-width: 180px"
            >
              Raised
            </th>
            <th
              class="px-4 py-3 text-left text-xs font-bold tracking-wide text-[#81948a] uppercase"
            >
              Status
            </th>
            <th
              class="px-5 py-3 text-right text-xs font-bold tracking-wide text-[#81948a] uppercase"
            ></th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="isLoading" data-test="offerings-loading">
            <td colspan="7" class="px-5 py-8 text-center text-sm text-[#9aaba2]">
              Loading offerings…
            </td>
          </tr>
          <tr v-else-if="offerings.length === 0" data-test="offerings-empty">
            <td colspan="7" class="px-5 py-8 text-center text-sm text-[#9aaba2]">
              No offerings yet.
            </td>
          </tr>
          <tr
            v-for="o in offerings"
            :key="o.id"
            data-test="offering-row"
            class="border-t border-[#f0f4f1] transition-colors hover:bg-[#f7fbf9]"
          >
            <td class="px-5 py-4 text-sm font-bold text-[#0f3d2e]">{{ o.title }}</td>
            <td class="px-4 py-4 text-right text-sm font-bold whitespace-nowrap text-[#0f3d2e]">
              {{ o.rate }}%
            </td>
            <td class="px-4 py-4 text-right text-sm font-semibold whitespace-nowrap text-[#0f3d2e]">
              {{ termLabel(o.term, o.termUnit) }}
            </td>
            <td class="px-4 py-4">
              <UBadge :color="o.access === 'whitelist' ? 'info' : 'success'" variant="soft">
                {{ o.access === 'whitelist' ? 'Whitelist' : 'Open to all' }}
              </UBadge>
            </td>
            <td class="px-4 py-4">
              <div class="mb-1.5 flex justify-between text-xs font-semibold">
                <span class="text-[#7d8e84]">{{ moneyShort(o.raised) }}</span>
                <span class="text-[#9aaba2]">of {{ moneyShort(o.target) }} · {{ pct(o) }}%</span>
              </div>
              <div class="h-1.5 overflow-hidden rounded-full bg-[#eef3f0]">
                <div class="bg-primary h-full rounded-full" :style="{ width: pct(o) + '%' }"></div>
              </div>
            </td>
            <td class="px-4 py-4">
              <StatusBadge :status="o.status" />
            </td>
            <td class="px-5 py-4 text-right">
              <UButton
                size="sm"
                color="primary"
                variant="soft"
                label="Manage"
                trailing-icon="heroicons:arrow-right"
                data-test="offering-manage-button"
                @click="$emit('manage', o)"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import StatusBadge from './StatusBadge.vue'
import { useTeamStore } from '@/stores'
import { useFixedReturnAllOffers } from '@/composables/fixedReturn/reads'
import { useGetFixedReturnOfferingsQuery } from '@/queries'
import { fromLendingOfferStruct, moneyShort, percentOf, termLabel } from '@/utils'
import type { OfferingSummary } from '@/types'

defineEmits<{ manage: [offering: OfferingSummary] }>()

const teamStore = useTeamStore()

const { data: offeringMetadata } = useGetFixedReturnOfferingsQuery({
  queryParams: { teamId: teamStore.currentTeamId }
})

const { data: rawOfferings, isLoading } = useFixedReturnAllOffers()

// Title comes from the off-chain metadata endpoint (FixedReturn.sol has no title
// param) — merged here so the on-chain query doesn't need to know about it, and so a
// later-arriving metadata response still updates the title reactively.
const offerings = computed<OfferingSummary[]>(() => {
  const metadataByOfferId = new Map(offeringMetadata.value?.map((m) => [m.offerId, m.title]))
  return (rawOfferings.value ?? []).map(({ offerId, offer, decimals }) =>
    fromLendingOfferStruct(offerId, offer, decimals, metadataByOfferId.get(offerId))
  )
})

function pct(o: OfferingSummary): number {
  return percentOf(o.raised, o.target)
}
</script>
