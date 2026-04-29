<template>
  <div class="flex flex-col gap-6">
    <div v-if="teamStore.currentTeamMeta.isPending" class="flex justify-center">
      <UIcon name="i-lucide-loader-circle" class="text-primary h-10 w-10 animate-spin" />
    </div>
    <div
      v-if="!teamStore.currentTeamMeta.isPending && teamStore"
      class="flex w-full flex-col items-center gap-5"
    >
      <UCard class="w-full">
        <template #header>
          <div class="flex items-center justify-between">
            <span>Main contract</span>
            <UButton
              color="primary"
              :disabled="teamStore.currentTeam?.ownerAddress !== userStore.address"
              @click="showModal = true"
              data-test="createAddCampaign"
            >
              Redeploy Contracts
            </UButton>
          </div>
        </template>
        <MainContractTable />
      </UCard>
    </div>
    <RedeployOfficerModal v-model:open="showModal" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useUserDataStore } from '@/stores/user'
import { useTeamStore } from '@/stores'
import MainContractTable from './MainContractTable.vue'
import RedeployOfficerModal from './RedeployOfficerModal.vue'

const teamStore = useTeamStore()
const userStore = useUserDataStore()

const showModal = ref(false)
</script>
