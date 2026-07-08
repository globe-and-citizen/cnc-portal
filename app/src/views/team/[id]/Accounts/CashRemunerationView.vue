<template>
  <div class="flex flex-col gap-6">
    <UAlert
      v-if="showMigrationBanner"
      color="warning"
      variant="subtle"
      icon="i-heroicons-exclamation-triangle"
      title="This team is on the previous contract version"
      description="Redeploy the team contracts to enable new claim signatures. Existing signed claims can still be withdrawn."
      data-test="cash-remuneration-migration-banner"
    />

    <CashRemunerationOverview />

    <div class="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
      <OwnerTreasuryWithdrawAction contractType="CashRemunerationEIP712" />

      <div class="ml-auto flex flex-wrap items-center justify-end gap-2 sm:gap-4">
        <span class="text-sm">Contract Address</span>

        <AddressToolTip
          v-if="cashRemunerationAddress"
          :address="cashRemunerationAddress"
          class="text-sm font-bold"
        />
      </div>
    </div>
    <GenericTokenHoldingsSection
      v-if="cashRemunerationAddress"
      :address="cashRemunerationAddress"
    />

    <MemberSection />

    <ContractOwnerCard v-if="cashRemunerationAddress" :contractAddress="cashRemunerationAddress" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useTeamStore } from '@/stores'
import AddressToolTip from '@/components/AddressToolTip.vue'
import ContractOwnerCard from '@/components/ContractOwnerCard.vue'

import GenericTokenHoldingsSection from '@/components/GenericTokenHoldingsSection.vue'
import CashRemunerationOverview from '@/components/sections/CashRemunerationView/CashRemunerationOverview.vue'
import OwnerTreasuryWithdrawAction from '@/components/sections/OwnerTreasuryWithdrawAction.vue'

const teamStore = useTeamStore()

const cashRemunerationAddress = computed(() =>
  teamStore.getContractAddressByType('CashRemunerationEIP712')
)

// Surface the migration warning only once we have a team payload — the banner
// would otherwise flash on initial load before isMigrated resolves. Teams
// with no Officer at all also report `isMigrated: false`; we still want the
// banner there so the owner is nudged to deploy contracts.
const showMigrationBanner = computed(() => {
  const team = teamStore.currentTeamMeta.data
  return team !== undefined && team !== null && team.isMigrated === false
})
</script>
