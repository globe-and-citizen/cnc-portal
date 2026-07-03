<template>
  <UCard :ui="{ body: 'p-0' }">
    <template #header>
      <div class="text-base font-extrabold text-[#0f3d2e]">
        Offerings <span class="text-sm font-semibold text-[#9aaba2]">· {{ offerings.length }}</span>
      </div>
    </template>
    <UTable :data="offerings" :columns="columns" :loading="isLoading" class="min-w-[820px]">
      <template #offering-cell="{ row: { original: offering } }">
        <span data-test="offering-row" class="font-bold text-[#0f3d2e]">
          {{ offering.title }}
        </span>
      </template>
      <template #rate-cell="{ row: { original: offering } }">
        <span class="font-bold">{{ offering.rate }}%</span>
      </template>
      <template #term-cell="{ row: { original: offering } }">
        {{ termLabel(offering.term, offering.termUnit) }}
      </template>
      <template #access-cell="{ row: { original: offering } }">
        <UBadge :color="offering.access === 'whitelist' ? 'info' : 'success'" variant="soft">
          {{ offering.access === 'whitelist' ? 'Whitelist' : 'Open to all' }}
        </UBadge>
      </template>
      <template #raised-cell="{ row: { original: offering } }">
        <div class="min-w-44">
          <div class="mb-1.5 flex justify-between font-semibold">
            <span class="text-[#7d8e84]">{{ moneyShort(offering.raised) }}</span>
            <span class="text-[#9aaba2]">
              of {{ moneyShort(offering.target) }} ·
              {{ percentOf(offering.raised, offering.target) }}%
            </span>
          </div>
          <UProgress
            :model-value="percentOf(offering.raised, offering.target)"
            :max="100"
            size="xs"
          />
        </div>
      </template>
      <template #status-cell="{ row: { original: offering } }">
        <StatusBadge :status="offering.status" />
      </template>
      <template #actions-cell="{ row: { original: offering } }">
        <UButton
          size="xs"
          color="primary"
          variant="soft"
          label="Manage"
          trailing-icon="heroicons:arrow-right"
          data-test="offering-manage-button"
          @click="$emit('manage', offering)"
        />
      </template>
      <template #loading>
        <div data-test="offerings-loading" class="flex flex-col gap-2 p-5">
          <USkeleton v-for="index in 3" :key="index" class="h-10 w-full" />
        </div>
      </template>
      <template #empty>
        <UEmpty
          data-test="offerings-empty"
          icon="heroicons:banknotes"
          :title="isOwner ? 'No offerings yet.' : 'You haven\'t participated in any offerings yet.'"
        />
      </template>
    </UTable>
  </UCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { isAddress, isAddressEqual } from 'viem'
import { useTeamStore, useUserDataStore } from '@/stores'
import StatusBadge from './StatusBadge.vue'
import {
  useFixedReturnAllOffers,
  useFixedReturnMyLenderPositions,
  useFixedReturnOwner
} from '@/composables/fixedReturn/reads'
import { useGetFixedReturnOfferingsQuery } from '@/queries'
import { fromLendingOfferStruct, moneyShort, percentOf, termLabel } from '@/utils'
import type { OfferingSummary } from '@/types'

defineEmits<{ manage: [offering: OfferingSummary] }>()

const teamStore = useTeamStore()
const userStore = useUserDataStore()
const { data: fixedReturnOwnerAddress } = useFixedReturnOwner()
const isOwner = computed(() => {
  const ownerAddress = fixedReturnOwnerAddress.value
  return (
    typeof ownerAddress === 'string' &&
    isAddress(ownerAddress, { strict: false }) &&
    isAddress(userStore.address, { strict: false }) &&
    isAddressEqual(ownerAddress, userStore.address)
  )
})

const { data: offeringMetadata } = useGetFixedReturnOfferingsQuery({
  queryParams: { teamId: teamStore.currentTeamId }
})

const { data: rawOfferings, isLoading } = useFixedReturnAllOffers()
const { data: myLenderPositions } = useFixedReturnMyLenderPositions()

const columns = [
  { accessorKey: 'offering', header: 'Offering' },
  { accessorKey: 'rate', header: 'Rate' },
  { accessorKey: 'term', header: 'Term' },
  { accessorKey: 'access', header: 'Access' },
  { accessorKey: 'raised', header: 'Raised' },
  { accessorKey: 'status', header: 'Status' },
  { accessorKey: 'actions', header: '' }
]

// Title comes from the off-chain metadata endpoint (FixedReturn.sol has no title
// param) — merged here so the on-chain query doesn't need to know about it, and so a
// later-arriving metadata response still updates the title reactively.
const offerings = computed<OfferingSummary[]>(() => {
  const metadataByOfferId = new Map(offeringMetadata.value?.map((m) => [m.offerId, m.title]))
  const positions = myLenderPositions.value ?? new Map()
  return (rawOfferings.value ?? [])
    .filter(({ offerId }) => isOwner.value || (positions.get(offerId)?.deposited ?? 0n) > 0n)
    .map(({ offerId, offer, decimals }) =>
      fromLendingOfferStruct(offerId, offer, decimals, metadataByOfferId.get(offerId))
    )
})
</script>
