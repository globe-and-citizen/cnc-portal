<template>
  <div>
    <UModal
      v-model:open="showModal"
      :ui="{
        footer: 'justify-between',
        content: 'rounded-2xl'
      }"
    >
      <UButton
        size="sm"
        color="success"
        data-test="set-wage-button"
        @click="showModal = true"
        class="text-xs px-4 py-2 text-black rounded-lg"
      >
        Set Wage
      </UButton>

      <template #header>
        <div class="flex w-full items-center justify-between">
          <p class="font-bold text-lg">Set Member Wage</p>
          <UButton
            icon="i-heroicons-x-mark"
            color="error"
            variant="outline"
            size="sm"
            square
            @click="handleCancel"
            data-test="close-wage-modal-button"
          />
        </div>
      </template>

      <template #body>
        <div class="space-y-4 mt-1">
          <UStepper v-if="wageData.enableOvertimeRules" :items="items" v-model="currentStep" />

          <SetMemberWageStandardStep v-if="currentStep === 0" v-model:wageData="wageData" />

          <!--<SetMemberWageOvertimeStep
            v-else
            v-model:wageData="wageData"
            :rateFieldConfigs="rateFieldConfigs"
            :overtimeHoursErrors="v$.wageData.maximumOvertimeHoursPerWeek.$errors"
            :overtimeRateErrors="overtimeRateValidationErrors"
            :overtimeRatePerHourErrors="v$.overtimeRatePerHour.$errors"
            :standardRateSummary="standardRateSummary"
            :overtimeRateSummary="overtimeRateSummary"
          /> -->

          <div v-if="setWageError" data-test="error-state">
            <UAlert
              color="error"
              variant="soft"
              icon="i-heroicons-x-circle"
              :description="
                (setWageError as AxiosError<{ message?: string }>).response?.data?.message ||
                'Error setting wage'
              "
            />
          </div>

          <div class="modal-action justify-between w-full">
            <UButton
              v-if="props.wage"
              :loading="isMemberWageSaving"
              :disabled="isMemberWageSaving"
              color="error"
              size="lg"
              @click="handleResetWage"
              data-test="reset-wage-button"
            >
              Reset Wage
            </UButton>
            <div class="ml-auto flex gap-3">
              <UButton
                v-if="currentStep === 0"
                color="error"
                variant="outline"
                size="lg"
                @click="handleCancel"
                data-test="add-wage-cancel-button"
              >
                Cancel
              </UButton>
              <UButton
                v-else
                variant="outline"
                size="lg"
                @click="handleBack"
                data-test="back-wage-button"
              >
                ← Back
              </UButton>
              <UButton
                :loading="isMemberWageSaving"
                :disabled="isMemberWageSaving"
                color="success"
                size="lg"
                @click="handleSaveWage"
                :data-test="currentStep === 0 ? 'add-wage-button' : 'save-overtime-wage-button'"
              >
                {{ currentStep === 0 && wageData.enableOvertimeRules ? 'Next →' : 'Save' }}
              </UButton>
            </div>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import SetMemberWageStandardStep from './SetMemberWageStandardStep.vue'
import SetMemberWageOvertimeStep from './SetMemberWageOvertimeStep.vue'
import { useWageForm } from '@/composables/useWageForm'
import type { Member, Wage } from '@/types'
import type { AxiosError } from 'axios'

import type { StepperItem } from '@nuxt/ui'

const items = ref<StepperItem[]>([
  {
    title: 'Standard wage '
  },

  {
    title: 'Overtime wage'
  }
])

const currentStep = ref(0)

const props = defineProps<{
  member: Partial<Member>
  teamId: number | string
  wage?: Wage
}>()

const emits = defineEmits<{ wageUpdated: [] }>()

const showModal = ref(false)
const requiredRateTypes = ['native', 'usdc', 'sher'] as const

type RatePerHourWithEnabled = Wage['ratePerHour'][number] & { enabled: boolean }

const normalizeRatePerHour = (rates?: Wage['ratePerHour'] | null): RatePerHourWithEnabled[] => {
  return requiredRateTypes.map((type) => {
    const existingRate = rates?.find((rate) => rate.type === type)

    return {
      type,
      amount: existingRate?.amount ?? 0,
      enabled: existingRate ? existingRate.amount > 0 : false
    }
  })
}

export type WageWithForm = Omit<Wage, 'ratePerHour' | 'overtimeRatePerHour'> & {
  enableOvertimeRules: boolean
  ratePerHour: RatePerHourWithEnabled[]
  overtimeRatePerHour: RatePerHourWithEnabled[]
}

const initialWage = (): WageWithForm => {
  return props.wage
    ? {
        ...props.wage,
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
        ratePerHour: normalizeRatePerHour(),
        overtimeRatePerHour: normalizeRatePerHour(),
        enableOvertimeRules: false,
        maximumHoursPerWeek: 0,
        nextWageId: null,
        createdAt: '',
        updatedAt: ''
      }
}
const wageData = ref<WageWithForm>(initialWage())

const {
  isMemberWageSaving,
  setWageError,
  handleSaveWage,
  handleBack,
  handleResetWage,
  resetFormState
} = useWageForm({
  wage: () => props.wage,
  teamId: () => props.teamId,
  memberAddress: () => props.member.address || '',
  onSuccess: () => {
    emits('wageUpdated')
    handleCancel()
  }
})

const handleCancel = () => {
  showModal.value = false
}

watch(
  () => showModal.value,
  (isOpen, wasOpen) => {
    if (!isOpen && wasOpen) {
      resetFormState()
    }
  }
)

watch(
  () => props.wage,
  () => {
    if (!showModal.value) {
      resetFormState()
    }
  },
  { deep: true }
)
</script>
