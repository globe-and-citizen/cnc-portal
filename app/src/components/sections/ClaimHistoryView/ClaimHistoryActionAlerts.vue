<template>
  <CardComponent data-test="action-alerts">
    <div class="flex flex-col gap-4">
      <!-- Submit Claims Alert (for member's own view) -->
      <div
        role="alert"
        class="alert alert-vertical sm:alert-horizontal"
        v-if="memberAddress === userStore.address"
      >
        <IconifyIcon icon="heroicons:information-circle" class="w-8 h-8 text-info" />
        <span>{{ claimSubmitMessage }}</span>
        <div>
          <SubmitClaims
            v-if="hasWage && isCurrentWeek"
            :weekly-claim="weeklyClaim"
            :signed-week-starts="signedWeekStarts"
            :restrict-submit="false"
          />
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

      <!-- Approve Claims Alert (for owner view) -->
      <div
        role="alert"
        class="alert alert-vertical sm:alert-horizontal"
        v-if="weeklyClaim && !weeklyClaim.signature"
      >
        <IconifyIcon icon="heroicons:information-circle" class="w-8 h-8 text-info" />
        <span>{{
          weeklyClaim?.weekStart === currentWeekStart
            ? 'You cannot approve the current week claim, wait until the week is over'
            : weeklyClaim?.weekStart === nextWeekStart
              ? 'You cannot approve the next week claim, wait until the week is over'
              : 'As the owner of the Cash Remuneration contract, you can approve this claim'
        }}</span>
        <div>
          <CRSigne
            v-if="weeklyClaim.claims.length > 0"
            :disabled="
              weeklyClaim.weekStart === currentWeekStart || weeklyClaim.weekStart === nextWeekStart
            "
            :weekly-claim="weeklyClaim"
          />
        </div>
      </div>

      <!-- Withdraw Claims Alert (for signed claims) -->
      <div
        role="alert"
        class="alert alert-vertical sm:alert-horizontal"
        v-if="
          weeklyClaim &&
          (weeklyClaim.status == 'signed' || weeklyClaim.status == 'withdrawn') &&
          userStore.address === weeklyClaim.wage.userAddress
        "
      >
        <IconifyIcon icon="heroicons:information-circle" class="w-8 h-8 text-info" />
        <span v-if="weeklyClaim.status == 'withdrawn'">You have withdrawn your weekly claim.</span>
        <span v-else>Your weekly claim has been approved. You can now withdraw it.</span>
        <div>
          <CRWithdrawClaim
            v-if="weeklyClaim.claims.length > 0"
            :disabled="weeklyClaim.status == 'withdrawn'"
            :weekly-claim="weeklyClaim"
          />
        </div>
      </div>
    </div>
  </CardComponent>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import isoWeek from 'dayjs/plugin/isoWeek'
import { Icon as IconifyIcon } from '@iconify/vue'
import type { Address } from 'viem'
import type { Week } from '@/utils/dayUtils'
import { useTeamStore, useToastStore, useUserDataStore } from '@/stores'
import { useGetTeamWagesQuery, useGetTeamWeeklyClaimsQuery } from '@/queries'
import type { WeeklyClaim } from '@/types'
import CardComponent from '@/components/CardComponent.vue'
import SubmitClaims from '../CashRemunerationView/SubmitClaims.vue'
import CRSigne from '../CashRemunerationView/CRSigne.vue'
import ButtonUI from '@/components/ButtonUI.vue'
import CRWithdrawClaim from '../CashRemunerationView/CRWithdrawClaim.vue'

dayjs.extend(utc)
dayjs.extend(isoWeek)

interface Props {
  weeklyClaim?: WeeklyClaim
  memberAddress: Address
  selectedWeek: Week
}

const props = defineProps<Props>()

const teamStore = useTeamStore()
const userStore = useUserDataStore()
const toastStore = useToastStore()

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
    toastStore.addErrorToast('Failed to fetch user wage data')
  }
})

const currentWeekStart = dayjs().utc().startOf('isoWeek').toISOString()
const nextWeekStart = dayjs().utc().add(1, 'week').startOf('isoWeek').toISOString()

const isCurrentWeek = computed(() => currentWeekStart === props.selectedWeek.isoString)

const claimSubmitMessage = computed(() => {
  if (hasWage.value && isCurrentWeek.value) {
    return 'You have a wage so you can submit your claim'
  }

  if (hasWage.value && props.weeklyClaim && props.weeklyClaim?.status !== 'pending') {
    return `This week claim is already ${props.weeklyClaim?.status}, you cannot submit new claims`
  }

  if (!hasWage.value) {
    return 'You need to have a wage set up to submit claims'
  }

  return 'You cannot submit a claim for this week'
})

// Current signed weeks for disabling dates in claim form
const signedWeekStarts = computed(() => {
  return (
    memberWeeklyClaims.value
      ?.filter((weeklyClaim) => weeklyClaim.status === 'signed' || weeklyClaim.signature)
      .map((weeklyClaim) => weeklyClaim.weekStart) ?? []
  )
})
</script>
