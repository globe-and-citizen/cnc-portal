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
      <CardComponent class="w-full" title="Main contract">
        <template #card-action>
          <div>
            <ButtonUI
              variant="primary"
              :enabled="teamStore.currentTeam?.ownerAddress == userStore.address"
              data-test="createAddCampaign"
            >
              Redeploy Contracts
            </ButtonUI>
          </div>
        </template>
        <MainContractTable />
      </CardComponent>
    </div>
  </div>
</template>
<script setup lang="ts">
import CardComponent from '@/components/CardComponent.vue'
import { useUserDataStore } from '@/stores/user'
import { useTeamStore } from '@/stores'
import ButtonUI from '@/components/ButtonUI.vue'
import MainContractTable from './MainContractTable.vue'

const teamStore = useTeamStore()
const userStore = useUserDataStore()
</script>
