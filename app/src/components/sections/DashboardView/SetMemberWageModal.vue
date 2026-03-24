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

          <!-- Step 0: Standard wage -->
          <UForm
            v-if="currentStep === 0"
            :schema="standardSchema"
            :state="wageData"
            class="space-y-4"
            data-test="standard-wage-step"
            @submit="onStandardSubmit"
          >
            <UFormField name="maximumHoursPerWeek">
              <UInput
                v-model="wageData.maximumHoursPerWeek"
                class="w-full"
                size="xl"
                type="number"
                placeholder="Enter max hours per week..."
                :ui="{
                  base: 'pl-36',
                  leading: 'pointer-events-none'
                }"
              >
                <template #leading>
                  <p class="text-sm text-muted">Max Weekly Hours |</p>
                </template>
              </UInput>
            </UFormField>
            <UFormField name="ratePerHour">
              <div class="space-y-4">
                <h3 class="text-lg font-semibold mb-4">Hourly Rates</h3>

                <UFieldGroup
                  v-for="(rate, index) in wageData.ratePerHour"
                  :key="rate.type"
                  class="flex items-center gap-4"
                >
                  <USwitch size="xl" v-model="rate.enabled" />
                  <UFormField :name="`ratePerHour.${index}.amount`" class="w-full">
                    <UInput
                      v-model="rate.amount"
                      placeholder="0.00"
                      size="xl"
                      type="number"
                      class="w-full"
                      :disabled="!rate.enabled"
                    >
                      <template #trailing>
                        <UBadge
                          class="text-sm rounded-full px-4 test w-16 flex justify-center"
                          :variant="rate.enabled ? 'solid' : 'outline'"
                          :color="rate.enabled ? 'primary' : 'neutral'"
                        >
                          {{
                            rate.type === 'native'
                              ? NETWORK.currencySymbol
                              : rate.type.toUpperCase()
                          }}
                        </UBadge>
                      </template>
                    </UInput>
                  </UFormField>
                </UFieldGroup>
              </div>
            </UFormField>

            <div class="border-t border-base-200 pt-4">
              <label
                class="flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-4 transition"
                :class="
                  wageData.enableOvertimeRules
                    ? 'border-emerald-400 bg-emerald-50/60'
                    : 'border-base-200 bg-base-100'
                "
                data-test="enable-overtime-card"
              >
                <UCheckbox
                  v-model="wageData.enableOvertimeRules"
                  color="success"
                  class="mt-1"
                  data-test="enable-overtime-checkbox"
                />
                <div>
                  <p class="font-semibold">Enable overtime rules</p>
                  <p class="text-sm text-base-content/60">
                    Define a custom wage for hours worked beyond the weekly limit.
                  </p>
                </div>
              </label>
            </div>

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
                type="button"
                @click="wageData = initialWage()"
                data-test="reset-wage-button"
              >
                Reset Wage
              </UButton>
              <div class="ml-auto flex gap-3">
                <UButton
                  color="error"
                  variant="outline"
                  size="lg"
                  type="button"
                  @click="handleCancel"
                  data-test="add-wage-cancel-button"
                >
                  Cancel
                </UButton>
                <UButton
                  type="submit"
                  :loading="isPending"
                  :disabled="isPending"
                  color="success"
                  size="lg"
                  data-test="add-wage-button"
                >
                  {{ wageData.enableOvertimeRules ? 'Next →' : 'Save' }}
                </UButton>
              </div>
            </div>
          </UForm>

          <!-- Step 1: Overtime wage -->
          <UForm
            v-else
            :schema="overtimeSchema"
            :state="wageData"
            class="space-y-4"
            data-test="overtime-rules-step"
            @submit="submitWage"
          >
            <UAlert
              color="success"
              variant="soft"
              class="rounded-2xl border border-emerald-300"
              data-test="overtime-banner"
            >
              <template #description>
                <p class="mt-2 text-emerald-900">
                  Hours beyond
                  <span class="font-semibold">{{ wageData.maximumHoursPerWeek }} hrs/wk</span> will
                  be paid at the rates below, instead of the standard rates.
                </p>
              </template>
            </UAlert>

            <UFormField name="maximumOvertimeHoursPerWeek">
              <UInput
                v-model="wageData.maximumOvertimeHoursPerWeek"
                class="w-full"
                size="xl"
                type="number"
                placeholder="Enter overtime hours per week..."
                :ui="{
                  base: 'pl-36',
                  leading: 'pointer-events-none'
                }"
              >
                <template #leading>
                  <p class="text-sm text-muted">Overtime Hours |</p>
                </template>
              </UInput>
            </UFormField>

            <h3 class="text-lg font-semibold mb-4">Overtime Hourly Rates</h3>

            <UFormField name="overtimeRatePerHour">
              <div class="space-y-4">
                <UFieldGroup
                  v-for="(rate, index) in wageData.overtimeRatePerHour"
                  :key="rate.type"
                  class="flex items-center gap-4"
                >
                  <USwitch size="xl" v-model="rate.enabled" />
                  <UFormField :name="`overtimeRatePerHour.${index}.amount`" class="w-full">
                    <UInput
                      v-model="rate.amount"
                      placeholder="0.00"
                      size="xl"
                      type="number"
                      class="w-full"
                      :disabled="!rate.enabled"
                    >
                      <template #trailing>
                        <UBadge
                          class="text-sm rounded-full px-4 w-16 flex justify-center"
                          :variant="rate.enabled ? 'solid' : 'outline'"
                          :color="rate.enabled ? 'primary' : 'neutral'"
                        >
                          {{
                            rate.type === 'native'
                              ? NETWORK.currencySymbol
                              : rate.type.toUpperCase()
                          }}
                        </UBadge>
                      </template>
                    </UInput>
                  </UFormField>
                </UFieldGroup>
              </div>
            </UFormField>
            <div class="grid gap-4 md:grid-cols-2">
              <div
                class="min-h-40 rounded-2xl border border-base-300 bg-base-100 px-5 py-5"
                data-test="standard-rate-recap"
              >
                <p class="text-sm font-semibold uppercase tracking-[0.2em] text-base-content/50">
                  Standard
                </p>
                <div class="mt-3 space-y-2">
                  <p
                    v-for="rate in wageData.ratePerHour.filter((r) => r.enabled && r.amount > 0)"
                    :key="rate.type"
                    class="text-lg font-semibold text-base-content/80"
                  >
                    {{ formatRate(rate.type, rate.amount) }}
                  </p>
                </div>
              </div>
              <div
                class="min-h-40 rounded-2xl border border-emerald-300 bg-emerald-50/60 px-5 py-5"
                data-test="overtime-rate-recap"
              >
                <p class="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">
                  Overtime
                </p>
                <div class="mt-3 space-y-2">
                  <p
                    v-for="rate in wageData.overtimeRatePerHour.filter(
                      (r) => r.enabled && r.amount > 0
                    )"
                    :key="rate.type"
                    class="text-lg font-semibold text-emerald-700"
                  >
                    {{ formatRate(rate.type, rate.amount) }}
                  </p>
                </div>
              </div>
            </div>

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
              <div class="ml-auto flex gap-3">
                <UButton
                  variant="outline"
                  size="lg"
                  type="button"
                  @click="currentStep = 0"
                  data-test="back-wage-button"
                >
                  ← Back
                </UButton>
                <UButton
                  type="submit"
                  :loading="isPending"
                  :disabled="isPending"
                  color="success"
                  size="lg"
                  data-test="save-overtime-wage-button"
                >
                  Save
                </UButton>
              </div>
            </div>
          </UForm>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import * as z from 'zod'
import { ref, computed } from 'vue'
import { useSetMemberWageMutation } from '@/queries/wage.queries'
import type { Member, Wage, WageWithForm } from '@/types'
import type { AxiosError } from 'axios'
import { normalizeRatePerHour, buildRatePayload } from '@/utils'
import { NETWORK } from '@/constant'
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

const rateSchema = z.object({
  type: z.enum(['native', 'usdc', 'sher', 'usdc.e']),
  amount: z.coerce.number(),
  enabled: z.boolean()
})

const standardSchema = z.object({
  maximumHoursPerWeek: z.coerce
    .number()
    .int('Must be a whole number')
    .positive('Max weekly hours must be greater than 0'),
  ratePerHour: z.array(rateSchema).superRefine((rates, ctx) => {
    console.log(
      'Enabled rates:',
      rates.filter((r) => r.enabled)
    )
    if (rates.filter((r) => r.enabled).length === 0) {
      console.log('Validation error: No rates enabled')
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [], message: 'Enable at least one rate' })
    }
    for (const [index, rate] of rates.entries()) {
      if (rate.enabled && rate.amount <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [index, 'amount'],
          message: 'Enabled rates must be greater than 0'
        })
      }
    }
  })
})

const overtimeSchema = z.object({
  maximumOvertimeHoursPerWeek: z.coerce
    .number()
    .int('Must be a whole number')
    .positive('Overtime hours must be greater than 0'),
  overtimeRatePerHour: z.array(rateSchema).superRefine((rates, ctx) => {
    if (rates.filter((r) => r.enabled).length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [],
        message: 'Enable at least one overtime rate'
      })
    }
    for (const [index, rate] of rates.entries()) {
      if (rate.enabled && rate.amount <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [index, 'amount'],
          message: 'Enabled overtime rates must be greater than 0'
        })
      }
    }
  })
})

const toast = useToast()

const { mutate: executeSetWage, error: setWageError, isPending } = useSetMemberWageMutation()

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
        toast.add({ title: 'Member wage data set successfully', color: 'success' })
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

const formatRate = (type: string, amount: number) => {
  const label = type === 'native' ? NETWORK.currencySymbol : type.toUpperCase()
  return `${amount} ${label}/hr`
}
</script>
