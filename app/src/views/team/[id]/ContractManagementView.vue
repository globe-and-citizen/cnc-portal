<template>
  <div class="flex flex-col gap-6">
    <span v-if="teamIsFetching" class="loading loading-spinner loading-lg"></span>
    <div v-if="!teamIsFetching && team" class="flex flex-col gap-5 w-full items-center">
      <TeamMeta />
      <div>
        <ButtonUI
          size="sm"
          variant="primary"
          @click="addCampaignModal = true"
          v-if="team.ownerAddress == useUserDataStore().address"
          data-test="createAddCampaign"
        >
          Deploy advertise contract
        </ButtonUI>
      </div>
      <CardComponent class="w-full" title="Campaign contract">
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
// Store imports
//import { useToastStore } from '@/stores/useToastStore'
import { useUserDataStore } from '@/stores/user'
import { useTeamStore } from '@/stores'
// Composables
//Components
import ModalComponent from '@/components/ModalComponent.vue'

import TeamMeta from '@/components/sections/DashboardView/TeamMetaSection.vue'

import ButtonUI from '@/components/ButtonUI.vue'

//imports for add campaign creation.
import CreateAddCampaign from '@/components/forms/CreateAddCampaign.vue'

import TeamContracts from '@/components/TeamContracts.vue'

// Modal control states

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
