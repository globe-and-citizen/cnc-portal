<template>
  <div class="flex flex-col gap-6">
    <h2>CASH Remuneration</h2>
    <div class="flex gap-10">
      <OverviewCard
        title="Total Balance"
        bg-color="bg-[#C8FACD]"
        :card-icon="bagIcon"
        text-color="text-[#005249]"
        currency="USD"
        :amount="73900"
        :previous-amount="52000"
      />
      <OverviewCard
        title="Month Claimed"
        bg-color="bg-[#FEF3DE]"
        :card-icon="cartIcon"
        text-color="text-[#6A3B13]"
        :amount="10200"
        :previous-amount="8000"
      />
      <OverviewCard
        title="Pending Claim"
        bg-color="bg-[#D9F1F6]"
        :card-icon="personIcon"
        text-color="text-[#0C315A]"
        :amount="47900"
        :previous-amount="43200"
      />
    </div>
    <div class="flex flex-col sm:flex-row justify-end items-start sm:items-center gap-4">
      <div class="flex flex-wrap gap-2 sm:gap-4">
        <span class="text-sm">Contract Address </span>
        <AddressToolTip
          :address="teamStore.currentTeam?.cashRemunerationEip712Address ?? ''"
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
        :owner-address="teamStore.currentTeam?.ownerAddress"
        :claims="claims"
        :is-loading="claimsLoading"
      />
    </div>
    <GenericTransactionHistory
      :transactions="transactions"
      title="Cash Remuneration Transactions History"
      :currencies="['USD', 'CAD']"
      :currency-rates="{
        loading: false,
        error: null,
        getRate: () => 1
      }"
    ></GenericTransactionHistory>
  </div>
</template>

<script setup lang="ts">
import type { ClaimResponse } from '@/types'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useCustomFetch } from '@/composables/useCustomFetch'
import { useTeamStore, useToastStore } from '@/stores'
import { log } from '@/utils'
import AddressToolTip from '@/components/AddressToolTip.vue'
import OverviewCard from '@/components/OverviewCard.vue'
import CashRemunerationTable from '@/components/sections/CashRemunerationView/CashRemunerationTable.vue'
import SubmitClaims from '@/components/sections/CashRemunerationView/SubmitClaims.vue'
import GenericTransactionHistory from '@/components/GenericTransactionHistory.vue'
import type { BaseTransaction } from '@/types/transactions'
import { NETWORK } from '@/constant'
import bagIcon from '@/assets/bag.svg'
import cartIcon from '@/assets/cart.svg'
import personIcon from '@/assets/person.svg'

const route = useRoute()
const claimStatus = ref<string>('all')
const { addErrorToast } = useToastStore()
const teamStore = useTeamStore()

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

onMounted(async () => {
  await teamStore.setCurrentTeamId(route.params.id as string)
  await fetchClaims()
})

// Dummy data
const transactions = ref<BaseTransaction[]>([
  {
    txHash: '0xfc9fc4e2c32197c0868a96134b027755e5f7eacb88ffdb7c8e70a27f38d5b55e',
    date: Date.now(),
    type: 'Deposit',
    from: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
    to: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    amountUSD: 10,
    receipt: `${NETWORK.blockExplorerUrl}/tx/0xfc9fc4e2c32197c0868a96134b027755e5f7eacb88ffdb7c8e70a27f38d5b55e`
  }
])
</script>
