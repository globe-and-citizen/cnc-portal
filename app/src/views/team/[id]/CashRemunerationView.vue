<template>
  <div class="flex flex-col gap-y-4 py-6 lg:px-4 sm:px-6">
    <h2>CASH Remuneration</h2>
    <div class="flex gap-10">
      <CashRemunerationCard cardType="balance" :amount="1000" />
      <CashRemunerationCard cardType="month-claims" :amount="500" />
      <CashRemunerationCard cardType="approved-claims" :amount="50" />
    </div>
    <div class="flex flex-col sm:flex-row justify-end items-start sm:items-center gap-4">
      <div class="flex flex-wrap gap-2 sm:gap-4">
        <span class="text-sm">Contract Address </span>
        <AddressToolTip
          :address="team?.cashRemunerationEip712Address ?? ''"
          class="text-sm font-bold"
        />
      </div>
    </div>
    <div class="overflow-x-auto flex flex-col gap-4 card bg-white p-6">
      <div class="w-full flex justify-between">
        <span class="font-bold text-lg">Claims Table</span>
        <SubmitClaims @refetch-claims="async () => await fetchClaims()" />
      </div>
      <CashRemunerationTable
        @fetch-claims="
          async (status: string) => {
            claimStatus = status
            await fetchClaims()
          }
        "
        :owner-address="team?.ownerAddress"
        :claims="claims"
        :is-loading="claimsLoading"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ClaimResponse, Team } from '@/types'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCustomFetch } from '@/composables/useCustomFetch'
import { useToastStore } from '@/stores'
import { log, parseError } from '@/utils'
import AddressToolTip from '@/components/AddressToolTip.vue'
import CashRemunerationCard from '@/components/sections/CashRemunerationView/CashRemunerationCard.vue'
import CashRemunerationTable from '@/components/sections/CashRemunerationView/CashRemunerationTable.vue'
import SubmitClaims from '@/components/sections/CashRemunerationView/SubmitClaims.vue'

const router = useRouter()
const route = useRoute()
const claimStatus = ref<string>('all')
const { addErrorToast } = useToastStore()

const { data: team, error: teamError } = useCustomFetch(`teams/${String(route.params.id)}`)
  .get()
  .json<Team>()

const claimsUrl = computed(
  () => `/teams/${route.params.id}/cash-remuneration/claim/${claimStatus.value}`
)
const {
  data: claims,
  error: claimsError,
  isFetching: claimsLoading,
  execute: fetchClaims
} = useCustomFetch(claimsUrl).get().json<ClaimResponse[]>()

watch(claimsError, (newVal) => {
  if (newVal) {
    log.error(newVal)
    addErrorToast('Failed to fetch claims')
  }
})

watch(teamError, (newVal) => {
  if (newVal) {
    addErrorToast(parseError(newVal))
    log.error(parseError(newVal))

    router.push({ name: 'teams' })
  }
})

onMounted(async () => {
  await fetchClaims()
})
</script>
