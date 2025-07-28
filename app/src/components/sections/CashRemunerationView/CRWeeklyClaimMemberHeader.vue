<template>
  <div>
    <div class="px-8 pb-4 pt-8 flex items-end" :class="{ 'justify-between': hasWage }">
      <span class="card-title"> Pending Weekly Claim Withdrawal </span>
      <div class="card-actions justify-end">
        <SubmitClaims v-if="hasWage" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useCustomFetch } from '@/composables/useCustomFetch'
import { computed, watch } from 'vue'
import { useUserDataStore, useTeamStore, useToastStore } from '@/stores'
import { type WageResponse } from '@/types'
import SubmitClaims from './SubmitClaims.vue'

const userStore = useUserDataStore()
const teamStore = useTeamStore()
const toastStore = useToastStore()

const { data: teamWageData, error: teamWageDataError } = useCustomFetch(
  computed(() => `/wage/?teamId=${teamStore.currentTeam?.id}`)
)
  .get()
  .json<Array<WageResponse>>()

const hasWage = computed(() => {
  const userWage = teamWageData.value?.find((wage) => wage.userAddress === userStore.address)
  if (!userWage) return false

  return true
})

watch(teamWageDataError, (newVal) => {
  if (newVal) {
    toastStore.addErrorToast('Failed to fetch user wage data')
  }
})
</script>
