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
        :text="wage?.disabled ? 'Resume this wage before making changes' : undefined"
        :content="{
          side: 'top'
        }"
      >
        <UButton
          size="lg"
          color="success"
          data-test="set-wage-button"
          :disabled="wage?.disabled"
          @click="showModal = true"
          label="Set Wage"
        />
      </UTooltip>

      <template #body>
        <div class="space-y-4 mt-1">
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
import { ref, computed } from 'vue'
import SetMemberWageStandardStep from './SetMemberWageStandardStep.vue'
import SetMemberWageOvertimeStep from './SetMemberWageOvertimeStep.vue'
import { useSetMemberWageMutation } from '@/queries/wage.queries'
import type { Member, Wage, WageWithForm } from '@/types'
import type { AxiosError } from 'axios'
import { normalizeRatePerHour, buildRatePayload } from '@/utils'
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

const toast = useToast()

const { mutate: executeSetWage, error: setWageError, isPending } = useSetMemberWageMutation()

const errorMessage = computed(() => {
  if (!setWageError.value) return undefined
  return (
    (setWageError.value as AxiosError<{ message?: string }>).response?.data?.message ||
    'Error setting wage'
  )
})

const handleCancel = () => {
  showModal.value = false
  currentStep.value = 0
}

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
        maximumHoursPerWeek: Number(wageData.value.maximumHoursPerWeek)
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
