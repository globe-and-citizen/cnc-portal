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
          <div class="flex items-center justify-between">
            <span>Advertise Contract</span>
            <div>
              <TeamArchivedTooltip v-slot="{ disabled: archivedDisabled }">
                <UButton
                  color="primary"
                  :disabled="
                    teamStore.currentTeam?.ownerAddress != userStore.address || archivedDisabled
                  "
                  data-test="createAddCampaign"
                  @click="openAdCampaignModal"
                  label="Deploy Advertise Contract"
                />
              </TeamArchivedTooltip>
            </div>
          </div>
        </template>
        <TeamContracts />
      </UCard>
      <UModal
        v-if="showAdCampaignModal.mount"
        v-model:open="showAdCampaignModal.show"
        title="Deploy Advertising Campaign"
        description="Deploy a new campaign contract to advertise your team’s work and attract contributors."
      >
        <template #body>
          <CreateAddCampaign
            @closeAddCampaignModal="showAdCampaignModal = { mount: false, show: false }"
          />
        </template>
      </UModal>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import TeamContracts from '@/components/sections/ContractManagementView/TeamContracts.vue'
import { useUserDataStore } from '@/stores/user'
import { useTeamStore } from '@/stores'

import CreateAddCampaign from '@/components/sections/ContractManagementView/forms/CreateAddCampaign.vue'
import TeamArchivedTooltip from '@/components/ui/TeamArchivedTooltip.vue'
import { useTeamWriteGuard } from '@/composables/useTeamWriteGuard'

const teamStore = useTeamStore()
const userStore = useUserDataStore()
const { isWriteDisabled } = useTeamWriteGuard()

const showAdCampaignModal = ref({ mount: false, show: false })

function openAdCampaignModal() {
  if (isWriteDisabled.value) return
  showAdCampaignModal.value = { mount: true, show: true }
}
</script>
