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

          <SetMemberWageOvertimeStep
            v-else
            v-model:wageData="wageData"
            :rateFieldConfigs="rateFieldConfigs"
            :overtimeHoursErrors="v$.wageData.maximumOvertimeHoursPerWeek.$errors"
            :overtimeRateErrors="overtimeRateValidationErrors"
            :overtimeRatePerHourErrors="v$.overtimeRatePerHour.$errors"
            :standardRateSummary="standardRateSummary"
            :overtimeRateSummary="overtimeRateSummary"
          />

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
import { computed, ref, watch } from 'vue'
import SetMemberWageStandardStep from './SetMemberWageStandardStep.vue'
import SetMemberWageOvertimeStep from './SetMemberWageOvertimeStep.vue'
import { useWageForm } from '@/composables/useWageForm'
import type { Member, RateFormKey, Wage } from '@/types'
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

const {
  wageData,
  // currentStep,
  v$,
  standardRateSummary,
  overtimeRateSummary,
  isMemberWageSaving,
  setWageError,
  rateFieldConfigs,
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

const standardRateValidationErrors = computed(() => {
  const keys: RateFormKey[] = ['hourlyRate', 'hourlyRateUsdc', 'hourlyRateToken']
  return Object.fromEntries(
    keys.map((key) => [key, v$.value.wageData.standardRates[key].$errors])
  ) as Record<RateFormKey, typeof v$.value.wageData.standardRates.hourlyRate.$errors>
})

const overtimeRateValidationErrors = computed(() => {
  const keys: RateFormKey[] = ['hourlyRate', 'hourlyRateUsdc', 'hourlyRateToken']
  return Object.fromEntries(
    keys.map((key) => [key, v$.value.wageData.overtimeRates[key].$errors])
  ) as Record<RateFormKey, typeof v$.value.wageData.overtimeRates.hourlyRate.$errors>
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
