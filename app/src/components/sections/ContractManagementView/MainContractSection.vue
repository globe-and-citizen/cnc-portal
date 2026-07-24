<template>
  <div class="flex flex-col gap-6">
    <div v-if="teamStore.currentTeamMeta.isPending" class="flex justify-center">
      <UIcon name="i-lucide-loader-circle" class="text-primary h-10 w-10 animate-spin" />
    </div>
    <div
      v-if="!teamStore.currentTeamMeta.isPending && teamStore"
      class="flex w-full flex-col items-center gap-6"
    >
      <div
        v-if="officersQuery.isError.value"
        class="text-error flex w-full items-center gap-2 text-sm"
      >
        <UIcon name="i-lucide-triangle-alert" class="h-4 w-4" />
        Failed to load Officer generations
      </div>

      <!-- One card per Officer generation (current first), each rendered with the
           same rich table — the current card keeps the "Main contract" title +
           Redeploy, legacy cards show their version + Officer address. -->
      <UCard v-for="gen in generations" :key="gen.key" class="w-full">
        <template #header>
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="flex flex-wrap items-center gap-2">
              <template v-if="gen.isCurrent">
                <span>Main contract</span>
                <UBadge color="primary" variant="subtle" size="sm">
                  {{ gen.version || 'unknown' }}
                </UBadge>
                <UBadge color="success" variant="soft" size="sm">current</UBadge>
              </template>
              <template v-else>
                <UBadge color="neutral" variant="subtle" size="sm">
                  {{ gen.version || 'unknown' }}
                </UBadge>
                <UBadge color="neutral" variant="soft" size="sm">legacy</UBadge>
              </template>
              <span class="text-sm text-gray-500">Officer</span>
              <AddressToolTip :address="gen.officerAddress" class="text-xs" />
            </div>

            <TeamArchivedTooltip v-if="gen.isCurrent" v-slot="{ disabled: archivedDisabled }">
              <UButton
                color="primary"
                :disabled="
                  teamStore.currentTeam?.ownerAddress !== userStore.address || archivedDisabled
                "
                @click="openRedeployModal"
                data-test="createAddCampaign"
              >
                Redeploy Contracts
              </UButton>
            </TeamArchivedTooltip>
          </div>
        </template>

        <MainContractTable :contracts="gen.contracts" :version="gen.version" />
      </UCard>
    </div>
    <RedeployOfficerModal v-model:open="showModal" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useUserDataStore } from '@/stores/user'
import { useTeamStore } from '@/stores'
import MainContractTable from './MainContractTable.vue'
import RedeployOfficerModal from './RedeployOfficerModal.vue'
import TeamArchivedTooltip from '@/components/TeamArchivedTooltip.vue'
import AddressToolTip from '@/components/AddressToolTip.vue'
import { useTeamWriteGuard } from '@/composables/useTeamWriteGuard'
import { useGetTeamOfficersQuery } from '@/queries/contract.queries'

const teamStore = useTeamStore()
const userStore = useUserDataStore()
const { isWriteDisabled } = useTeamWriteGuard()

const showModal = ref(false)

// Officer generations of the team (newest first), each with its contracts.
const officersQuery = useGetTeamOfficersQuery({
  queryParams: { teamId: () => teamStore.currentTeamId ?? '' }
})

// The current generation uses the team's merged `teamContracts` (which includes
// the officer-less Safe / SafeDepositRouter); legacy generations use the
// contracts returned per officer.
const generations = computed(() =>
  (officersQuery.data.value ?? []).map((officer) => ({
    key: officer.id,
    version: officer.version,
    officerAddress: officer.address,
    isCurrent: officer.isCurrent,
    contracts: officer.isCurrent ? (teamStore.currentTeam?.teamContracts ?? []) : officer.contracts
  }))
)

function openRedeployModal() {
  if (isWriteDisabled.value) return
  showModal.value = true
}
</script>
