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
      :investor-address="investorAddressValue"
      :migration-data="migrationData"
      :user-address="userAddress"
      data-test="merkle-claim-form-section"
    />
    <MigrationOwnerSweep
      v-if="canSettleMigration && migrationComplete !== true"
      :investor-address="investorAddressValue"
      :migration-data="migrationData"
      data-test="migration-owner-sweep-section"
    />
    <UAlert
      v-else-if="showOwnerVerification"
      color="warning"
      variant="soft"
      icon="i-heroicons-shield-exclamation"
      :title="ownerVerificationTitle"
      :description="ownerVerificationDescription"
      data-test="migration-owner-verification"
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
  useInvestorMigrationRoot,
  useInvestorOwner
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
const {
  data: investorOwner,
  error: investorOwnerError,
  isPending: investorOwnerPending
} = useInvestorOwner()
const { data: allMigrations } = useGetInvestorMigrationQuery({
  queryParams: { teamId: teamStore.currentTeamId as string | number }
})

// Get the most recent migration (backend sorts by createdAt desc)
const migrationData = computed(() => allMigrations.value?.[0])

const isCompanyOwner = computed(() => {
  const teamData = teamStore.currentTeamMeta.data
  return !!(
    teamData?.ownerAddress &&
    userStore.address &&
    teamData.ownerAddress.toLowerCase() === userStore.address.toLowerCase()
  )
})

const isInvestorOwner = computed(
  () =>
    typeof investorOwner.value === 'string' &&
    !!userStore.address &&
    investorOwner.value.toLowerCase() === userStore.address.toLowerCase()
)

const canSettleMigration = computed(() => isCompanyOwner.value && isInvestorOwner.value)

const showOwnerVerification = computed(
  () => isCompanyOwner.value && migrationComplete.value !== true && !isInvestorOwner.value
)

const ownerVerificationTitle = computed(() => {
  if (investorOwnerPending.value) return 'Checking Investor ownership'
  if (investorOwnerError.value || typeof investorOwner.value !== 'string')
    return 'Investor ownership unavailable'
  return 'Investor owner access required'
})

const ownerVerificationDescription = computed(() => {
  if (investorOwnerPending.value)
    return 'Migration settlement stays unavailable until the current Investor owner is verified.'
  if (investorOwnerError.value || typeof investorOwner.value !== 'string')
    return 'The current Investor owner could not be verified. Retry the contract read before dispatching or completing the migration.'
  return 'The connected company owner does not own the current Investor contract and cannot dispatch or complete this migration.'
})

const showSection = computed(() => {
  if (!investorAddress.value) return false
  if (migrationRoot.value === undefined || migrationRoot.value === null) return false
  if (migrationRoot.value === '0x0000000000000000000000000000000000000000000000000000000000000000')
    return false
  return !!migrationData.value
})
</script>
