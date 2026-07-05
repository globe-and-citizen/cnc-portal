<!-- filepath: app/src/views/team/[id]/Accounts/SafeView.vue -->
<template>
  <div v-if="safeAddress" class="flex flex-col gap-6">
    <SafeBalanceSection :key="safeAddress" :address="safeAddress" />

    <div class="grid grid-cols-1 gap-6 xl:grid-cols-5">
      <div class="min-w-0 xl:col-span-3">
        <GenericTokenHoldingsSection :key="safeAddress" :address="safeAddress" class="h-full" />
      </div>
      <div class="min-w-0 xl:col-span-2">
        <SafeOwnersCard :address="safeAddress" />
      </div>
    </div>

    <SafeTransactions :address="safeAddress" />

    <SafeIncomingTransactions :address="safeAddress" />
  </div>

  <!-- Safe not deployed state -->
  <div
    v-else-if="teamStore.currentTeamId && !isLoadingSafe"
    class="flex items-center justify-center p-8"
  >
    <SafeDeploymentCard
      :team-id="Number(teamStore.currentTeamId)"
      @safe-deployed="handleSafeDeployed"
    />
  </div>

  <!-- Loading state -->
  <div v-else class="flex items-center justify-center p-8">
    <div class="text-center">
      <UIcon name="i-lucide-loader-circle" class="text-primary mx-auto h-10 w-10 animate-spin" />
      <p class="mt-4 text-gray-500">Loading safe...</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import SafeBalanceSection from '@/components/sections/SafeView/SafeBalanceSection.vue'
import SafeOwnersCard from '@/components/sections/SafeView/SafeOwnersCard.vue'
import GenericTokenHoldingsSection from '@/components/ui/GenericTokenHoldingsSection.vue'
import SafeTransactions from '@/components/sections/SafeView/SafeTransactions.vue'
import SafeIncomingTransactions from '@/components/sections/SafeView/SafeIncomingTransactions.vue'
import SafeDeploymentCard from '@/components/sections/SafeView/SafeDeploymentCard.vue'
import { type Address } from 'viem'
import { useTeamStore } from '@/stores/teamStore'

const route = useRoute()
const router = useRouter()
const teamStore = useTeamStore()

const isLoadingSafe = ref(false)
const deployedSafeAddress = ref<Address>()

const safeAddress = computed(
  () => teamStore.getContractAddressByType('Safe') || deployedSafeAddress.value
)

watch(safeAddress, (address) => {
  if (address) {
    isLoadingSafe.value = false
  }
})

/**
 * Handle successful Safe deployment
 */
const handleSafeDeployed = async (address: Address) => {
  deployedSafeAddress.value = address
  isLoadingSafe.value = true

  if (route.params.id && route.params.address !== address) {
    await router.replace({
      name: 'safe-account',
      params: {
        id: route.params.id as string,
        address
      }
    })
  }
}
</script>
