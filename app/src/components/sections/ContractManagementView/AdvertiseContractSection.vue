<template>
  <div class="flex flex-col gap-6">
    <span
      v-if="teamStore.currentTeamMeta.teamIsFetching"
      class="loading loading-spinner loading-lg"
    ></span>
    <div
      v-if="!teamStore.currentTeamMeta.teamIsFetching && teamStore"
      class="flex flex-col gap-5 w-full items-center"
    >
      <CardComponent class="w-full" title="Advertise Contract">
        <template #card-action>
          <div>
            <ButtonUI
              variant="primary"
              :enabled="teamStore.currentTeam?.ownerAddress == userStore.address"
              data-test="createAddCampaign"
              @click="showAdCampaignModal = { mount: true, show: true }"
            >
              Deploy Advertise Contract
            </ButtonUI>
          </div>
        </template>
        <TeamContracts />
      </CardComponent>
      <ModalComponent
        v-model="showAdCampaignModal.show"
        v-if="showAdCampaignModal.mount"
        @reset="() => (showAdCampaignModal = { mount: false, show: false })"
      >
        <CreateAddCampaign
          @closeAddCampaignModal="showAdCampaignModal = { mount: false, show: false }"
        />
      </ModalComponent>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import TeamContracts from '@/components/sections/ContractManagementView/TeamContracts.vue'
import CardComponent from '@/components/CardComponent.vue'
import { useUserDataStore } from '@/stores/user'
import { useTeamStore } from '@/stores'
import ButtonUI from '@/components/ButtonUI.vue'

import ModalComponent from '@/components/ModalComponent.vue'
import CreateAddCampaign from '@/components/sections/ContractManagementView/forms/CreateAddCampaign.vue'

const teamStore = useTeamStore()
const userStore = useUserDataStore()

const showAdCampaignModal = ref({ mount: false, show: false })
</script>
