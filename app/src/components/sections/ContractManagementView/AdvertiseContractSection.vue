<template>
  <div class="flex flex-col gap-6">
    <span v-if="teamIsFetching" class="loading loading-spinner loading-lg"></span>
    <div v-if="!teamIsFetching && team" class="flex flex-col gap-5 w-full items-center">
      <CardComponent class="w-full" title="Advertise Contract">
        <template #card-action>
          <div>
            <ButtonUI
              variant="primary"
              :enabled="team.ownerAddress == useUserDataStore().address"
              data-test="createAddCampaign"
              @click="showAdCampaignModal = true"
            >
              Deploy Advertise Contract
            </ButtonUI>
          </div>
        </template>
        <TeamContracts />
      </CardComponent>
      <ModalComponent v-model="showAdCampaignModal">
        <CreateAddCampaign />
      </ModalComponent>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed, ref } from 'vue'
import TeamContracts from '@/components/sections/ContractManagementView/TeamContracts.vue'
import CardComponent from '@/components/CardComponent.vue'
import { useUserDataStore } from '@/stores/user'
import { useTeamStore } from '@/stores'
import ButtonUI from '@/components/ButtonUI.vue'

import ModalComponent from '@/components/ModalComponent.vue'
import CreateAddCampaign from '@/components/sections/ContractManagementView/forms/CreateAddCampaign.vue'

const teamStore = useTeamStore()
const team = computed(() => teamStore.currentTeam)
const showAdCampaignModal = ref(false)

const teamIsFetching = computed(() => teamStore.currentTeamMeta.teamIsFetching)
</script>
