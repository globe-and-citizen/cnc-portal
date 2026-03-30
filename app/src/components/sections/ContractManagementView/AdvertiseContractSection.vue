<template>
  <div class="flex flex-col gap-6">
    <span
      v-if="teamStore.currentTeamMeta.isPending"
      class="loading loading-spinner loading-lg"
    ></span>
    <div
      v-if="!teamStore.currentTeamMeta.isPending && teamStore"
      class="flex flex-col gap-5 w-full items-center"
    >
      <UCard class="w-full">
        <template #header>
          <div class="flex justify-between items-center">
            <span>Advertise Contract</span>
            <div>
              <UButton
                color="primary"
                :disabled="teamStore.currentTeam?.ownerAddress != userStore.address"
                data-test="createAddCampaign"
                @click="showAdCampaignModal = { mount: true, show: true }"
                label="Deploy Advertise Contract"
              />
            </div>
          </div>
        </template>
        <TeamContracts />
      </UCard>
      <UModal v-if="showAdCampaignModal.mount" v-model:open="showAdCampaignModal.show">
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

const teamStore = useTeamStore()
const userStore = useUserDataStore()

const showAdCampaignModal = ref({ mount: false, show: false })
</script>
