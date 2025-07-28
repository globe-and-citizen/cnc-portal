<template>
  <div v-if="isTeamOwner">
    <div class="px-8 pb-4 flex items-end" :class="{ 'justify-between': isTeamOwner }">
      <span class="card-title" v-if="isTeamOwner">Pending Weekly Claim</span>
      <div class="card-actions justify-end">
        <CRAddERC20Support />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useCustomFetch } from '@/composables/useCustomFetch'
import { computed, watch } from 'vue'
import { useUserDataStore, useTeamStore, useToastStore } from '@/stores'
import { type WageResponse } from '@/types'

import CRAddERC20Support from './CRAddERC20Support.vue'

const userStore = useUserDataStore()
const teamStore = useTeamStore()
const toastStore = useToastStore()

const isTeamOwner = computed(() => {
  return teamStore.currentTeam?.ownerAddress === userStore.address
})
const { error: teamWageDataError } = useCustomFetch(
  computed(() => `/wage/?teamId=${teamStore.currentTeam?.id}`)
)
  .get()
  .json<Array<WageResponse>>()

watch(teamWageDataError, (newVal) => {
  if (newVal) {
    toastStore.addErrorToast('Failed to fetch user wage data')
  }
})
</script>
