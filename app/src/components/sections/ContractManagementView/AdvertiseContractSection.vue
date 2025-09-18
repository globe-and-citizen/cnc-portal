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
              @click="showAdCampaignModal = true"
            >
              Deploy Advertise Contract
            </ButtonUI>
          </div>
        </template>
        <TeamContracts />
      </CardComponent>
      <ModalComponent
        v-model="showAdCampaignModal"
        @closeWithReset="handleCloseWithReset"
        @closeWithoutReset="handleCloseWithoutReset"
      >
        <CreateAddCampaign
          ref="campaignFormRef"
          @closeAddCampaignModal="showAdCampaignModal = false"
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

const showAdCampaignModal = ref(false)

const campaignFormRef = ref<InstanceType<typeof CreateAddCampaign> | null>(null)

const handleCloseWithReset = () => {
  if (campaignFormRef.value) {
    campaignFormRef.value.resetForm()
  }
  showAdCampaignModal.value = false
}

const handleCloseWithoutReset = () => {
  showAdCampaignModal.value = false
}
</script>
