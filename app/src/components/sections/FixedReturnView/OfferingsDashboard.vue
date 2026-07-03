<template>
  <OfferingDetail
    v-if="selectedOffering"
    :offering="selectedOffering"
    @back="selectedOfferingId = null"
  />
  <template v-else>
    <FixedReturnBalanceSection />
    <GenericTokenHoldingsSection v-if="fixedReturnAddress" :address="fixedReturnAddress!" />
    <OfferingsList @manage="selectedOfferingId = $event.id" />
  </template>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import OfferingsList from './OfferingsList.vue'
import OfferingDetail from './OfferingDetail.vue'
import FixedReturnBalanceSection from './FixedReturnBalanceSection.vue'
import GenericTokenHoldingsSection from '@/components/ui/GenericTokenHoldingsSection.vue'
import { useTeamStore } from '@/stores'
import { useFixedReturnAllOffers, useFixedReturnAddress } from '@/composables/fixedReturn/reads'
import { useGetFixedReturnOfferingsQuery } from '@/queries'
import { fromLendingOfferStruct } from '@/utils'

const teamStore = useTeamStore()
const fixedReturnAddress = useFixedReturnAddress()
const { data: rawOfferings } = useFixedReturnAllOffers()
const { data: offeringMetadata } = useGetFixedReturnOfferingsQuery({
  queryParams: { teamId: teamStore.currentTeamId }
})

const selectedOfferingId = ref<string | null>(null)

const selectedOffering = computed(() => {
  if (!selectedOfferingId.value) return null
  const metadataByOfferId = new Map(offeringMetadata.value?.map((m) => [m.offerId, m.title]))
  const entry = (rawOfferings.value ?? []).find(
    ({ offerId }) => String(offerId) === selectedOfferingId.value
  )
  if (!entry) return null
  return fromLendingOfferStruct(
    entry.offerId,
    entry.offer,
    entry.decimals,
    metadataByOfferId.get(entry.offerId)
  )
})
</script>
