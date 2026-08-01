<template>
  <div v-if="showSection" class="flex flex-col gap-y-4">
    <UAlert
      :color="migrationComplete ? 'success' : 'info'"
      variant="soft"
      :icon="migrationComplete ? 'i-heroicons-check-circle' : 'i-heroicons-arrow-path'"
      :title="migrationComplete ? 'Migration status: Complete' : 'Migration status: Open'"
      :description="
        migrationComplete
          ? 'isMigrationComplete = true. All migration actions are closed on-chain.'
          : 'isMigrationComplete = false. Shareholders can still claim their migrated shares.'
      "
      data-test="migration-status-alert"
    />
    <MerkleClaimForm
      :investor-v2-address="investorAddressValue"
      :migration-data="migrationData"
      :user-address="userAddress"
      data-test="merkle-claim-form-section"
    />
    <MigrationOwnerSweep
      v-if="isOwner && migrationComplete !== true"
      :investor-v2-address="investorAddressValue"
      :migration-data="migrationData"
      data-test="migration-owner-sweep-section"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { type Address } from 'viem'
import { useTeamStore, useUserDataStore } from '@/stores'
import {
  useInvestorAddress,
  useInvestorMigrationComplete,
  useInvestorMigrationRoot
} from '@/composables/investor/reads'
import { useGetInvestorMigrationQuery } from '@/queries/investorMigration.queries'
import MerkleClaimForm from './MerkleClaimForm.vue'
import MigrationOwnerSweep from './MigrationOwnerSweep.vue'

const teamStore = useTeamStore()
const userStore = useUserDataStore()

const userAddress = computed(() => userStore.address as Address | undefined)

const investorAddress = useInvestorAddress()
const investorAddressValue = computed(() => investorAddress.value as Address)
const { data: migrationRoot } = useInvestorMigrationRoot()
const { data: migrationComplete } = useInvestorMigrationComplete()
const { data: allMigrations } = useGetInvestorMigrationQuery({
  queryParams: { teamId: teamStore.currentTeamId as string | number }
})

// Get the most recent migration (backend sorts by createdAt desc)
const migrationData = computed(() => allMigrations.value?.[0])

const isOwner = computed(() => {
  const teamData = teamStore.currentTeamMeta.data
  return !!(
    teamData?.ownerAddress &&
    userStore.address &&
    teamData.ownerAddress.toLowerCase() === userStore.address.toLowerCase()
  )
})

const showSection = computed(() => {
  if (!investorAddress.value) return false
  if (migrationRoot.value === undefined || migrationRoot.value === null) return false
  if (migrationRoot.value === '0x0000000000000000000000000000000000000000000000000000000000000000')
    return false
  return !!migrationData.value
})
</script>
