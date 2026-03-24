<template>
  <div>
    <UModal
      v-model:open="showModal"
      title="Set Member Wage"
      description="Fill the form to set the member current wage"
      :ui="{
        footer: 'justify-between',
        content: 'rounded-2xl'
      }"
    >
      <UButton
        size="lg"
        color="success"
        data-test="set-wage-button"
        @click="showModal = true"
        label="Set Wage"

      />

      <template #body>
        <div class="space-y-4 mt-1">
          <UStepper :items="items" v-model="currentStep" />

          <SetMemberWageStandardStep
            v-if="currentStep === 0"
            ref="standardStepRef"
            v-model:wageData="wageData"
            @validated="onStepValidated"
          />

          <SetMemberWageOvertimeStep
            v-else
            ref="overtimeStepRef"
            v-model:wageData="wageData"
            @validated="onStepValidated"
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
              color="error"
              size="lg"
              @click="
                () => {
                  wageData = initialWage()
                }
              "
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
                @click="
                  () => {
                    currentStep = 0
                  }
                "
                data-test="back-wage-button"
              >
                ← Back
              </UButton>
              <UButton
                :loading="isPending"
                :disabled="isPending"
                color="success"
                size="lg"
                @click="handlePrimaryAction"
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
import { ref, computed } from 'vue'
import SetMemberWageStandardStep from './SetMemberWageStandardStep.vue'
import SetMemberWageOvertimeStep from './SetMemberWageOvertimeStep.vue'
import { useSetMemberWageMutation } from '@/queries/wage.queries'
import type { Member, Wage, WageWithForm } from '@/types'
import type { AxiosError } from 'axios'
import { normalizeRatePerHour, buildRatePayload } from '@/utils'

import type { StepperItem } from '@nuxt/ui'

const currentStep = ref(0)
type WageStepRef = {
  submit: () => void
}

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
const items = computed<StepperItem[]>(() =>
  wageData.value.enableOvertimeRules
    ? [{ title: 'Standard wage' }, { title: 'Overtime wage' }]
    : [{ title: 'Standard wage' }]
)
const standardStepRef = ref<WageStepRef | null>(null)
const overtimeStepRef = ref<WageStepRef | null>(null)

const toast = useToast()

const { mutate: executeSetWage, error: setWageError, isPending } = useSetMemberWageMutation()

const handleCancel = () => {
  showModal.value = false
  currentStep.value = 0
}

const submitWage = () => {
  if (isPending.value) {
    return
  }
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
        maximumHoursPerWeek: Number(wageData.value.maximumHoursPerWeek)
      }
    },
    {
      onSuccess: () => {
        toast.add({ title: 'Member wage data set successfully', color: 'success' })
        handleCancel()
      },
      onError: (error: AxiosError) => {
        console.error('Error setting member wage:', error)
      }
    }
  )
}

const onStepValidated = () => {
  if (currentStep.value === 0 && wageData.value.enableOvertimeRules) {
    currentStep.value = 1
    return
  }
  submitWage()
}

const handlePrimaryAction = () => {
  if (currentStep.value === 0) {
    standardStepRef.value?.submit()
  } else {
    overtimeStepRef.value?.submit()
  }
}
</script>
