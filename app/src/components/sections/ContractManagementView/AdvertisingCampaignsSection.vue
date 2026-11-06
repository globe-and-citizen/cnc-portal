<template>
  <div class="flex flex-col gap-6">
    <UIcon
      v-if="teamStore.currentTeamMeta.isPending"
      name="i-lucide-loader-circle"
      class="text-primary h-10 w-10 animate-spin"
    />
    <div
      v-if="!teamStore.currentTeamMeta.isPending && teamStore"
      class="flex w-full flex-col items-center gap-5"
    >
      <UCard class="w-full">
        <template #header>
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 class="text-highlighted font-semibold">Advertising campaigns</h2>
              <p class="text-muted mt-1 text-sm">
                Configure advertising rates, fund campaigns and recover unused budgets.
              </p>
            </div>
            <div>
              <TeamArchivedTooltip
                v-if="!hasCampaignManager"
                v-slot="{ disabled: archivedDisabled }"
              >
                <UButton
                  color="primary"
                  icon="i-lucide-plus"
                  :disabled="
                    teamStore.currentTeam?.ownerAddress != userStore.address || archivedDisabled
                  "
                  data-test="deploy-campaign-manager"
                  @click="openManagerSetupModal"
                  label="Set up Campaign Manager"
                />
              </TeamArchivedTooltip>
            </div>
          </div>
        </template>
        <CampaignManagersSection />
      </UCard>
      <UModal
        v-if="managerSetupModal.mount"
        v-model:open="managerSetupModal.show"
        title="Set up Campaign Manager"
        description="Configure the on-chain service that creates and settles funded advertising campaigns."
      >
        <template #body>
          <DeployCampaignManagerForm @close="managerSetupModal = { mount: false, show: false }" />
        </template>
      </UModal>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed, ref } from 'vue'
import CampaignManagersSection from '@/components/sections/ContractManagementView/CampaignManagersSection.vue'
import { useUserDataStore } from '@/stores/user'
import { useTeamStore } from '@/stores'

import DeployCampaignManagerForm from '@/components/sections/ContractManagementView/forms/DeployCampaignManagerForm.vue'
import TeamArchivedTooltip from '@/components/ui/TeamArchivedTooltip.vue'
import { useTeamWriteGuard } from '@/composables/useTeamWriteGuard'

const teamStore = useTeamStore()
const userStore = useUserDataStore()
const { isWriteDisabled } = useTeamWriteGuard()

const hasCampaignManager = computed(() =>
  (teamStore.currentTeam?.teamContracts ?? []).some((contract) => contract.type === 'Campaign')
)

const managerSetupModal = ref({ mount: false, show: false })

function openManagerSetupModal() {
  if (isWriteDisabled.value) return
  managerSetupModal.value = { mount: true, show: true }
}
</script>
