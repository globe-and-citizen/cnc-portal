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

  <!-- Safe setup state -->
  <div v-else-if="teamStore.currentTeamId && !isLoadingSafe" class="w-full p-8">
    <section class="w-full" aria-labelledby="safe-setup-heading">
      <div class="mb-6 max-w-2xl">
        <p class="text-primary text-sm font-semibold">Team treasury</p>
        <h1
          id="safe-setup-heading"
          class="mt-1 text-2xl font-semibold text-gray-900 dark:text-white"
        >
          Set up your team Safe
        </h1>
        <p class="mt-2 text-gray-500">
          Deploy a new multi-signature wallet, or connect one your team already owns.
        </p>
      </div>

      <UAlert
        v-if="!canManageSafe"
        class="mb-6"
        color="warning"
        variant="soft"
        icon="i-lucide-shield-alert"
        description="Only the team owner can deploy or import a Safe. You can still inspect an existing Safe."
        data-test="safe-setup-owner-notice"
      />

      <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SafeDeploymentCard
          :team-id="Number(teamStore.currentTeamId)"
          @safe-deployed="handleSafeRegistered"
        />
        <SafeImportCard
          :team-id="Number(teamStore.currentTeamId)"
          @safe-imported="handleSafeRegistered"
        />
      </div>
    </section>
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
import GenericTokenHoldingsSection from '@/components/GenericTokenHoldingsSection.vue'
import SafeTransactions from '@/components/sections/SafeView/SafeTransactions.vue'
import SafeIncomingTransactions from '@/components/sections/SafeView/SafeIncomingTransactions.vue'
import SafeDeploymentCard from '@/components/sections/SafeView/SafeDeploymentCard.vue'
import SafeImportCard from '@/components/sections/SafeView/SafeImportCard.vue'
import { isAddress, type Address } from 'viem'
import { useTeamStore, useUserDataStore } from '@/stores'

const route = useRoute()
const router = useRouter()
const teamStore = useTeamStore()
const userDataStore = useUserDataStore()

const isLoadingSafe = ref(false)
const deployedSafeAddress = ref<Address>()

const safeAddress = computed(
  () => teamStore.getContractAddressByType('Safe') || deployedSafeAddress.value
)

const canManageSafe = computed(
  () =>
    !!userDataStore.address &&
    isAddress(userDataStore.address) &&
    teamStore.currentTeam?.ownerAddress.toLowerCase() === userDataStore.address.toLowerCase()
)

watch(safeAddress, (address) => {
  if (address) {
    isLoadingSafe.value = false
  }
})

/**
 * Handle successful Safe registration after deployment or import.
 */
const handleSafeRegistered = async (address: Address) => {
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
