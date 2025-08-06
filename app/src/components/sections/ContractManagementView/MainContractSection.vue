<template>
  <div class="flex flex-col gap-6">
    <span v-if="teamIsFetching" class="loading loading-spinner loading-lg"></span>
    <div v-if="!teamIsFetching && team" class="flex flex-col gap-5 w-full items-center">
      <CardComponent class="w-full" title="Main contract">
        <template #card-action>
          <div>
            <ButtonUI
              variant="primary"
              @click="addCampaignModal = true"
              v-if="team.ownerAddress == useUserDataStore().address"
              data-test="createAddCampaign"
            >
              Redeploy Contracts
            </ButtonUI>
          </div>
        </template>
        <TeamContracts :team-id="String(team.id)" :contracts="team.teamContracts" />
      </CardComponent>
      <ModalComponent v-model="addCampaignModal">
        <CreateAddCampaign
          @closeAddCampaignModal="addCampaignModal = false"
          :bankAddress="_teamBankContractAddress"
        />
      </ModalComponent>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, computed } from 'vue'

import CardComponent from '@/components/CardComponent.vue'
import { useUserDataStore } from '@/stores/user'
import { useTeamStore } from '@/stores'
import ModalComponent from '@/components/ModalComponent.vue'
import ButtonUI from '@/components/ButtonUI.vue'
import CreateAddCampaign from '@/components/forms/CreateAddCampaign.vue'
import TeamContracts from './MainContractTable.vue'

const teamStore = useTeamStore()
const team = computed(() => teamStore.currentTeam)

const teamIsFetching = computed(() => teamStore.currentTeamMeta.teamIsFetching)

//addCampaign
const addCampaignModal = ref(false)

const _teamBankContractAddress = computed(
  () =>
    teamStore.currentTeam?.teamContracts.find((c) => c.type === 'Bank')?.address ||
    teamStore.currentTeam?.ownerAddress ||
    `0x`
)
</script>
