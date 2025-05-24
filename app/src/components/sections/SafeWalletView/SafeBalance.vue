<template>
  <CardComponent title="Safe Wallet" class="w-full">
    <div class="flex flex-col gap-x-2">
      <div class="flex flex-row justify-between">
        <div>
          <div class="flex items-baseline gap-2">
            <span class="text-4xl font-bold">
              <span class="inline-block min-w-16 h-10">
                <span class="loading loading-spinner loading-lg" v-if="isLoadingBalance"></span>
                <span v-else>{{ balance }}</span>
              </span>
            </span>
            <span class="text-gray-600">{{ currency.symbol }}</span>
          </div>
          <div class="text-sm text-gray-500 mt-1">
            ≈ {{ balance }} {{ currencyStore.currency.code }}
          </div>
        </div>

        <SafeActions @refetch-balance="async () => await getBalance()" />
      </div>

      <div class="flex self-end gap-2">
        <div class="text-gray-600">Contract Address:</div>
        <AddressToolTip :address="safeWalletAddress!" />
      </div>
    </div>
  </CardComponent>
</template>
<script setup lang="ts">
import AddressToolTip from '@/components/AddressToolTip.vue'
import CardComponent from '@/components/CardComponent.vue'
import { useSafe } from '@/composables/useSafe'
import { useCurrencyStore, useTeamStore } from '@/stores'
import { storeToRefs } from 'pinia'
import SafeActions from '@/components/sections/SafeWalletView/SafeActions.vue'
import { onMounted } from 'vue'

const teamStore = useTeamStore()
const { getBalance, balance, isLoadingBalance } = useSafe()
const currencyStore = useCurrencyStore()
const { currency } = storeToRefs(currencyStore)
const safeWalletAddress = teamStore.currentTeam?.teamContracts.find(
  (contract) => contract.type == 'SafeWallet'
)?.address

onMounted(async () => {
  await getBalance()
})
</script>
