<template>
  <div>
    <UModal
      v-model:open="showModal"
      :title="`Set Wage for ${props.member.name}`"
      description="Configure standard and optional overtime rates for this member."
      :ui="{
        footer: 'justify-between',
        content: 'rounded-2xl'
      }"
    >
      <UTooltip
        :text="setWageTooltip"
        :content="{
          side: 'top'
        }"
      >
        <UButton
          size="lg"
          color="success"
          data-test="set-wage-button"
          :disabled="isWriteDisabled || wage?.disabled"
          @click="showModal = true"
          label="Set Wage"
        />
      </UTooltip>

      <template #body>
        <div class="mt-1 space-y-4">
          <UAlert
            v-if="props.wage"
            icon="i-heroicons-information-circle"
            :color="changeTiming.immediate ? 'warning' : 'info'"
            variant="soft"
            data-test="wage-effective-date-notice"
            :title="effectiveDateTitle"
            :description="effectiveDateDescription"
          />

          <UStepper :items="items" v-model="currentStep" />

          <SetMemberWageStandardStep
            v-if="currentStep === 0"
            v-model:wageData="wageData"
            :isPending="isPending"
            :wage="props.wage"
            :errorMessage="errorMessage"
            @validated="onStandardSubmit"
            @cancel="handleCancel"
            @reset="wageData = initialWage()"
          />

          <SetMemberWageOvertimeStep
            v-else
            v-model:wageData="wageData"
            :isPending="isPending"
            :errorMessage="errorMessage"
            @validated="submitWage"
            @back="currentStep = 0"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import SetMemberWageStandardStep from './SetMemberWageStandardStep.vue'
import SetMemberWageOvertimeStep from './SetMemberWageOvertimeStep.vue'
import { useSetMemberWageMutation } from '@/queries/wage.queries'
import type { Member, Wage, WageWithForm } from '@/types'
import type { AxiosError } from 'axios'
import { normalizeRatePerHour, buildRatePayload, DEFAULT_MAXIMUM_HOURS_PER_DAY } from '@/utils'
import { describeWageChangeTiming, formatScheduledWageNotice } from '@/utils/wageUtil'
import { useTeamWriteGuard } from '@/composables/useTeamWriteGuard'
import { getAxiosErrorMessage } from '@/utils/httpErrorUtil'
import type { StepperItem } from '@nuxt/ui'

const currentStep = ref(0)

const props = defineProps<{
  member: Partial<Member>
  teamId: number | string
  wage?: Wage
}>()

const showModal = ref(false)

const initialWage = (): WageWithForm => {
  return props.wage
    ? {
        ...props.wage,
        maximumHoursPerDay: props.wage.maximumHoursPerDay ?? DEFAULT_MAXIMUM_HOURS_PER_DAY,
        ratePerHour: normalizeRatePerHour(props.wage.ratePerHour),
        overtimeRatePerHour: normalizeRatePerHour(props.wage.overtimeRatePerHour),
        enableOvertimeRules: props.wage.overtimeRatePerHour
          ? props.wage.overtimeRatePerHour.some((rate) => rate.amount > 0)
          : false
      }
    : {
        id: 0,
        teamId: 0,
        userAddress: '',
        disabled: false,
        ratePerHour: normalizeRatePerHour(),
        overtimeRatePerHour: normalizeRatePerHour(),
        enableOvertimeRules: false,
        maximumHoursPerWeek: 0,
        maximumHoursPerDay: DEFAULT_MAXIMUM_HOURS_PER_DAY,
        nextWageId: null,
        createdAt: '',
        updatedAt: ''
      }
}

const wageData = ref<WageWithForm>(initialWage())

const changeTiming = computed(() => describeWageChangeTiming(props.wage))
const scheduledWageNotice = computed(() => formatScheduledWageNotice(props.wage?.scheduledWage))

// Two genuinely different situations, and the owner has to be able to tell
// them apart before saving. The member has not opened this week yet: the new
// rate covers the days they have already worked but not yet submitted, which
// is the case worth a warning. They have: this week is settled at the current
// rate and only the next one moves.
const effectiveDateTitle = computed(() =>
  changeTiming.value.immediate
    ? 'This change takes effect immediately, for the whole current week.'
    : `This change takes effect on ${changeTiming.value.label}.`
)

const effectiveDateDescription = computed(() => {
  if (changeTiming.value.immediate) {
    return `${props.member.name ?? 'This member'} has not submitted any hours for this week yet, so hours they have already worked will be paid at the new rate. Wait for them to submit to leave this week untouched.`
  }

  return scheduledWageNotice.value
    ? `A change is already scheduled for that date (${scheduledWageNotice.value}). Saving replaces it without pushing the date back.`
    : 'Hours are already submitted for this week, so the current rate stays in force until then.'
})

const items = computed<StepperItem[]>(() =>
  wageData.value.enableOvertimeRules
    ? [{ title: 'Standard wage' }, { title: 'Overtime wage' }]
    : [{ title: 'Standard wage' }]
)

const toast = useToast()
const { isWriteDisabled, archivedTooltip } = useTeamWriteGuard()

const setWageTooltip = computed(() => {
  if (archivedTooltip.value) return archivedTooltip.value
  if (props.wage?.disabled) return 'Resume this wage before making changes'
  return undefined
})

const {
  mutate: executeSetWage,
  error: setWageError,
  isPending,
  reset: resetSetWageMutation
} = useSetMemberWageMutation()

const errorMessage = computed(() => {
  if (!setWageError.value) return undefined
  return getAxiosErrorMessage(setWageError.value, 'Error setting wage')
})

const handleCancel = () => {
  showModal.value = false
  currentStep.value = 0
}

// Reset form state whenever the modal is closed
watch(
  () => showModal.value,
  (isOpen) => {
    if (!isOpen) {
      resetSetWageMutation()
      wageData.value = initialWage()
      currentStep.value = 0
    }
  },
  { flush: 'post' }
)

const submitWage = () => {
  if (isPending.value) return
  executeSetWage(
    {
      body: {
        teamId: props.teamId,
        userAddress: props.member.address || '',
        ratePerHour: buildRatePayload(wageData.value.ratePerHour),
        overtimeRatePerHour: wageData.value.enableOvertimeRules
          ? buildRatePayload(wageData.value.overtimeRatePerHour)
          : null,
        maximumOvertimeHoursPerWeek: wageData.value.enableOvertimeRules
          ? Number(wageData.value.maximumOvertimeHoursPerWeek ?? 0)
          : null,
        maximumHoursPerWeek: Number(wageData.value.maximumHoursPerWeek),
        maximumHoursPerDay: Number(wageData.value.maximumHoursPerDay)
      }
    },
    {
      onSuccess: () => {
        toast.add({ title: 'Wage updated successfully', color: 'success' })
        handleCancel()
      },
      onError: (error: AxiosError) => {
        console.error('Error setting member wage:', error)
      }
    }
  )
}

const onStandardSubmit = () => {
  if (wageData.value.enableOvertimeRules) {
    currentStep.value = 1
  } else {
    submitWage()
  }
}
</script>
