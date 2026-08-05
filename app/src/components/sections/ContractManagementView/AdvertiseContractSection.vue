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
                  data-test="createAddCampaign"
                  @click="openAdCampaignModal"
                  label="Set up Campaign Manager"
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
        title="Set up Campaign Manager"
        description="Configure the on-chain service that creates and settles funded advertising campaigns."
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
import { computed, ref } from 'vue'
import TeamContracts from '@/components/sections/ContractManagementView/TeamContracts.vue'
import { useUserDataStore } from '@/stores/user'
import { useTeamStore } from '@/stores'

import CreateAddCampaign from '@/components/sections/ContractManagementView/forms/CreateAddCampaign.vue'
import TeamArchivedTooltip from '@/components/TeamArchivedTooltip.vue'
import { useTeamWriteGuard } from '@/composables/useTeamWriteGuard'

const teamStore = useTeamStore()
const userStore = useUserDataStore()
const { isWriteDisabled } = useTeamWriteGuard()

const hasCampaignManager = computed(() =>
  (teamStore.currentTeam?.teamContracts ?? []).some((contract) => contract.type === 'Campaign')
)

const showAdCampaignModal = ref({ mount: false, show: false })

function openAdCampaignModal() {
  if (isWriteDisabled.value) return
  showAdCampaignModal.value = { mount: true, show: true }
}
</script>
