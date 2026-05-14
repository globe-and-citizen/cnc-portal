<template>
  <UCard data-test="action-alerts">
    <div class="flex flex-col gap-4">
      <!-- Submit Claims Alert (for member's own view) -->
      <UAlert
        v-if="memberAddress === userStore.address"
        color="info"
        variant="soft"
        icon="heroicons:information-circle"
        :description="claimSubmitMessage"
      >
        <template #actions>
          <SubmitClaims
            ref="submitClaimsRef"
            v-if="hasWage"
            :weekly-claim="weeklyClaim"
            :signed-week-starts="signedWeekStarts"
            :selected-week-start="selectedWeekStart"
          />
          <UButton
            v-else
            color="success"
            size="sm"
            :disabled="true"
            data-test="submit-claim-disabled-button"
          >
            Submit Claim
          </UButton>
        </template>
      </UAlert>

      <!-- Approve Claims Alert (for owner view) -->
      <UAlert
        v-if="weeklyClaim && !weeklyClaim.signature"
        color="info"
        variant="soft"
        icon="heroicons:information-circle"
        :description="
          weeklyClaim?.weekStart === currentWeekStart
            ? 'You cannot approve the current week claim, wait until the week is over'
            : weeklyClaim?.weekStart === nextWeekStart
              ? 'You cannot approve the next week claim, wait until the week is over'
              : 'As the owner of the Cash Remuneration contract, you can approve this claim'
        "
      >
        <template #actions>
          <CRSigne
            v-if="weeklyClaim.claims.length > 0"
            :disabled="
              weeklyClaim.weekStart === currentWeekStart || weeklyClaim.weekStart === nextWeekStart
            "
            :weekly-claim="weeklyClaim"
          />
        </template>
      </UAlert>

      <!-- Withdraw Claims Alert (for signed claims) -->
      <UAlert
        v-if="
          weeklyClaim &&
          (weeklyClaim.status == 'signed' || weeklyClaim.status == 'withdrawn') &&
          userStore.address === weeklyClaim.wage.userAddress
        "
        color="info"
        variant="soft"
        icon="heroicons:information-circle"
        :description="
          weeklyClaim.status == 'withdrawn'
            ? 'You have withdrawn your weekly claim.'
            : 'Your weekly claim has been approved. You can now withdraw it.'
        "
      >
        <template #actions>
          <CRWithdrawClaim
            v-if="weeklyClaim.claims.length > 0"
            :disabled="weeklyClaim.status == 'withdrawn'"
            :weekly-claim="weeklyClaim"
          />
        </template>
      </UAlert>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import isoWeek from 'dayjs/plugin/isoWeek'
import type { Address } from 'viem'
import { useTeamStore, useUserDataStore } from '@/stores'
import { useGetTeamWagesQuery, useGetTeamWeeklyClaimsQuery } from '@/queries'
import type { WeeklyClaim } from '@/types'
import SubmitClaims from '../CashRemunerationView/SubmitClaims.vue'
import CRSigne from '../CashRemunerationView/CRSigne.vue'
import CRWithdrawClaim from '../CashRemunerationView/CRWithdrawClaim.vue'

dayjs.extend(utc)
dayjs.extend(isoWeek)

interface Props {
  weeklyClaim?: WeeklyClaim
  memberAddress: Address
  selectedWeekStart: string
}

const props = defineProps<Props>()

const teamStore = useTeamStore()
const userStore = useUserDataStore()
const toast = useToast()

const { data: teamWageData, error: teamWageDataError } = useGetTeamWagesQuery({
  queryParams: { teamId: computed(() => teamStore.currentTeamId) }
})

const { data: memberWeeklyClaims } = useGetTeamWeeklyClaimsQuery({
  queryParams: {
    teamId: computed(() => teamStore.currentTeamId),
    userAddress: computed(() => props.memberAddress)
  }
})

const hasWage = computed(() => {
  const userWage = teamWageData.value?.find((wage) => wage.userAddress === userStore.address)
  if (!userWage) return false

  return true
})

watch(teamWageDataError, (newVal) => {
  if (newVal) {
    toast.add({ title: 'Failed to fetch user wage data', color: 'error' })
  }
})

const currentWeekStart = dayjs().utc().startOf('isoWeek').toISOString()
const nextWeekStart = dayjs().utc().add(1, 'week').startOf('isoWeek').toISOString()

type SubmitClaimsExposed = {
  openModalForDay: (dayIso: string) => void
}

const submitClaimsRef = ref<SubmitClaimsExposed | null>(null)

const claimSubmitMessage = computed(() => {
  if (hasWage.value && props.weeklyClaim && props.weeklyClaim?.status !== 'pending') {
    return `This week claim is already ${props.weeklyClaim?.status}, you cannot submit new claims`
  }

  if (hasWage.value) {
    return 'You have a wage so you can submit your claim'
  }

  return 'You need to have a wage set up to submit claims'
})

// Current signed weeks for disabling dates in claim form
const signedWeekStarts = computed(() => {
  return (
    memberWeeklyClaims.value
      ?.filter((weeklyClaim) => weeklyClaim.status === 'signed' || weeklyClaim.signature)
      .map((weeklyClaim) => weeklyClaim.weekStart) ?? []
  )
})

const openSubmitClaimForDay = (dayIso: string) => {
  submitClaimsRef.value?.openModalForDay(dayIso)
}

defineExpose({
  openSubmitClaimForDay
})
</script>
