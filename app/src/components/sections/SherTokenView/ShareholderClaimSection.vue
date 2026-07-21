<template>
  <div v-if="showSection" class="flex flex-col gap-y-4">
    <MerkleClaimForm
      :investor-v2-address="investorV2AddressValue"
      :migration-data="migrationData"
      :user-address="userAddress"
      data-test="merkle-claim-form-section"
    />
    <MigrationOwnerSweep
      v-if="isOwner"
      :investor-v2-address="investorV2AddressValue"
      :migration-data="migrationData"
      :claimed-addresses="claimedAddresses"
      data-test="migration-owner-sweep-section"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { type Address } from 'viem'
import { useTeamStore, useUserDataStore } from '@/stores'
import { useInvestorV2Address, useInvestorV2MigrationRoot } from '@/composables/investor/readsV2'
import { useGetInvestorMigrationQuery } from '@/queries/investorMigration.queries'
import MerkleClaimForm from './MerkleClaimForm.vue'
import MigrationOwnerSweep from './MigrationOwnerSweep.vue'

const teamStore = useTeamStore()
const userStore = useUserDataStore()

const userAddress = computed(() => userStore.address as Address | undefined)

const investorV2Address = useInvestorV2Address()
const investorV2AddressValue = computed(() => investorV2Address.value as Address)
const { data: migrationRoot } = useInvestorV2MigrationRoot()
const { data: migrationData } = useGetInvestorMigrationQuery({
  queryParams: { teamId: teamStore.currentTeamId as string | number }
})

const isOwner = computed(() => {
  const teamData = teamStore.currentTeamMeta.data
  return !!(
    teamData?.ownerAddress &&
    userStore.address &&
    teamData.ownerAddress.toLowerCase() === userStore.address.toLowerCase()
  )
})

const claimedAddresses = computed<Set<Address>>(() => {
  return new Set()
})

const showSection = computed(() => {
  if (!investorV2Address.value) return false
  if (migrationRoot.value === undefined || migrationRoot.value === null) return false
  if (migrationRoot.value === '0x0000000000000000000000000000000000000000000000000000000000000000')
    return false
  return !!migrationData.value
})
</script>
