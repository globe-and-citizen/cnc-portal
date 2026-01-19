<template>
  <div>
    <div class="px-8 pb-4 pt-8 flex items-end justify-between">
      <span class="card-title"> Pending Weekly Claim Withdrawal </span>
      <div class="card-actions justify-end">
        <div
          :class="{ tooltip: !hasWage }"
          :data-tip="!hasWage ? 'You need to have a wage set up to submit claims' : null"
        >
          <SubmitClaims v-if="hasWage" />
          <ButtonUI
            v-else
            variant="success"
            size="sm"
            :disabled="true"
            data-test="submit-claim-disabled-button"
          >
            Submit Claim
          </ButtonUI>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useTeamWagesQuery } from '@/queries'
import { computed, watch } from 'vue'
import { useUserDataStore, useTeamStore, useToastStore } from '@/stores'
import SubmitClaims from './SubmitClaims.vue'
import ButtonUI from '@/components/ButtonUI.vue'

const userStore = useUserDataStore()
const teamStore = useTeamStore()
const toastStore = useToastStore()

const { data: teamWageData, error: teamWageDataError } = useTeamWagesQuery(
  () => teamStore.currentTeamId
)

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
