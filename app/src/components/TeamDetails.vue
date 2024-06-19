<template>
  <div
    class="collapse collapse-arrow border"
    :class="`${team.ownerAddress == useUserDataStore().address ? 'bg-green-100' : 'bg-blue-100'}`"
  >
    <input type="checkbox" />
    <div class="collapse-title text-xl font-medium">
      <div class="flex items-center justify-center">
        <h2 class="pl-5">{{ team.name }}</h2>
        <div
          class="badge badge-sm badge-primary flex items-center justify-center ml-2"
          v-if="team.ownerAddress == useUserDataStore().address"
        >
          Owner
        </div>
        <div class="badge badge-sm badge-secondary ml-2" v-else>Employee</div>
      </div>
    </div>
    <div class="collapse-content">
      <p class="pl-5">{{ team.description }}</p>
      <p class="pl-5" v-if="team.bankAddress">Bank Contract Address: {{ team.bankAddress }}</p>
      <p class="pl-5" v-if="team.bankAddress && !balanceLoading">
        Team Balance: {{ teamBalance }} {{ NETWORK.currencySymbol }}
      </p>
      <p class="pl-5 flex flex-row gap-2" v-if="balanceLoading">
        <span>Team Balance: </span>
        <SkeletonLoading class="w-40 h-4 self-center" />
      </p>

      <div class="pl-5 flex flex-row justify-center gap-2 mt-5 items-center">
        <button
          class="btn btn-secondary btn-sm"
          v-if="team.ownerAddress == useUserDataStore().address"
          @click="emits('updateTeamModalOpen')"
        >
          Update
        </button>
        <button
          class="btn btn-error btn-sm"
          v-if="team.ownerAddress == useUserDataStore().address"
          @click="emits('deleteTeam')"
        >
          Delete
        </button>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { useUserDataStore } from '@/stores/user'
import SkeletonLoading from '@/components/SkeletonLoading.vue'
import { NETWORK } from '@/constant'
import { Team } from '@/types/Team'

const emits = defineEmits(['updateTeamModalOpen', 'deleteTeam'])
defineProps<{
  team: Partial<Team>
  teamBalance: number
  balanceLoading: boolean
}>()
</script>
