<template>
  <div>
    <ButtonUI size="sm" variant="success" @click="showModal = true" data-test="set-wage-button">
      Set Wage
    </ButtonUI>

    <ModalComponent v-model="showModal" v-if="showModal" @reset="handleCancel">
      <p class="font-bold text-lg">Set Member Wage</p>
      <hr class="my-2" />

      <div class="space-y-4 mt-3">
        <div class="rounded-2xl border border-base-200 bg-base-100 px-4 py-3">
          <div class="flex items-center gap-3" data-test="wage-stepper">
            <div class="flex items-center gap-3">
              <span
                class="flex size-7 items-center justify-center rounded-full text-sm font-semibold"
                :class="
                  currentStep === 2
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-emerald-500 text-white'
                "
              >
                {{ currentStep === 2 ? '✓' : '1' }}
              </span>
              <span class="text-sm font-semibold text-base-content">Standard wage</span>
            </div>
            <div class="h-px flex-1 bg-emerald-200"></div>
            <div class="flex items-center gap-3">
              <span
                class="flex size-7 items-center justify-center rounded-full text-sm font-semibold"
                :class="
                  currentStep === 2
                    ? 'bg-emerald-500 text-white'
                    : wageData.enableOvertimeRules
                      ? 'bg-base-200 text-base-content/70'
                      : 'bg-base-200 text-base-content/40'
                "
              >
                2
              </span>
              <span
                class="text-sm font-semibold"
                :class="currentStep === 2 ? 'text-base-content' : 'text-base-content/50'"
              >
                Overtime rules
              </span>
            </div>
          </div>
        </div>

        <div v-if="currentStep === 1" class="space-y-4" data-test="standard-wage-step">
          <div>
            <label class="input input-bordered flex items-center gap-2 input-md w-full">
              <span class="w-40">Max Weekly Hours</span>
              |
              <input
                type="text"
                class="grow"
                v-model="wageData.maxWeeklyHours"
                placeholder="Enter max hours per week..."
                data-test="max-hours-input"
              />
            </label>
            <div
              data-test="max-weekly-hours-error"
              class="text-red-500 text-sm w-full text-left"
              v-for="error of v$.wageData.maxWeeklyHours.$errors"
              :key="error.$uid"
            >
              {{ error.$message }}
            </div>
          </div>

          <div class="mb-4">
            <h3 class="text-lg font-semibold mb-4">Hourly Rates</h3>
            <div class="flex flex-col gap-6">
              <div v-for="field in rateFieldConfigs" :key="field.key" class="space-y-2">
                <div class="flex items-center gap-4">
                  <input
                    type="checkbox"
                    class="toggle toggle-info"
                    v-model="wageData.standardRates[field.enabledKey]"
                    :data-test="field.standardToggleTest"
                  />
                  <div class="relative w-full">
                    <input
                      :disabled="!wageData.standardRates[field.enabledKey]"
                      type="text"
                      class="input input-bordered w-full rounded-xl pr-16"
                      v-model="wageData.standardRates[field.amountKey]"
                      :placeholder="
                        wageData.standardRates[field.enabledKey]
                          ? field.activePlaceholder
                          : field.label
                      "
                      :data-test="field.standardInputTest"
                      style="min-width: 220px"
                    />
                    <span
                      class="badge absolute right-4 top-1/2 -translate-y-1/2"
                      :class="
                        wageData.standardRates[field.enabledKey]
                          ? 'badge-primary font-bold'
                          : 'badge-ghost text-gray-400'
                      "
                      style="transition: all 0.2s; pointer-events: none"
                    >
                      {{ field.label }}
                    </span>
                  </div>
                </div>
                <div
                  :data-test="field.standardErrorTest"
                  class="text-red-500 text-sm w-full text-left"
                  v-for="error of v$.wageData.standardRates[field.amountKey].$errors"
                  :key="error.$uid"
                >
                  {{ error.$message }}
                </div>
              </div>
            </div>
          </div>

          <div
            data-test="rate-per-hour-error"
            class="text-red-500 text-sm w-full text-left"
            v-for="error of v$.standardRatePerHour.$errors"
            :key="error.$uid"
          >
            {{ error.$message }}
          </div>

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
              <input
                type="checkbox"
                class="checkbox checkbox-success mt-1"
                v-model="wageData.enableOvertimeRules"
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
        </div>

        <div v-else class="space-y-4" data-test="overtime-rules-step">
          <div
            class="rounded-2xl border border-emerald-300 bg-emerald-50/70 px-4 py-4 text-sm text-emerald-800"
            data-test="overtime-banner"
          >
            <p class="mt-2 text-emerald-900">
              Hours beyond
              <span class="font-semibold">{{ wageData.maxWeeklyHours }} hrs/wk</span> will be paid
              at the rates below, instead of the standard rates.
            </p>
          </div>

          <div>
            <label class="input input-bordered flex items-center gap-2 input-md w-full">
              <span class="w-40">Overtime Hours</span>
              |
              <input
                type="text"
                class="grow"
                v-model="wageData.maximumOvertimeHoursPerWeek"
                placeholder="Enter overtime hours per week..."
                data-test="overtime-hours-input"
              />
            </label>
            <div
              data-test="overtime-hours-error"
              class="text-red-500 text-sm w-full text-left"
              v-for="error of v$.wageData.maximumOvertimeHoursPerWeek.$errors"
              :key="error.$uid"
            >
              {{ error.$message }}
            </div>
          </div>

          <div class="mb-4">
            <h3 class="text-lg font-semibold mb-4">Overtime Hourly Rates</h3>
            <div class="flex flex-col gap-6">
              <div
                v-for="field in rateFieldConfigs"
                :key="`overtime-${field.key}`"
                class="space-y-2"
              >
                <div class="flex items-center gap-4">
                  <input
                    type="checkbox"
                    class="toggle toggle-info"
                    v-model="wageData.overtimeRates[field.enabledKey]"
                    :data-test="field.overtimeToggleTest"
                  />
                  <div class="relative w-full">
                    <input
                      :disabled="!wageData.overtimeRates[field.enabledKey]"
                      type="text"
                      class="input input-bordered w-full rounded-xl pr-16"
                      v-model="wageData.overtimeRates[field.amountKey]"
                      :placeholder="
                        wageData.overtimeRates[field.enabledKey]
                          ? field.activePlaceholder
                          : field.label
                      "
                      :data-test="field.overtimeInputTest"
                      style="min-width: 220px"
                    />
                    <span
                      class="badge absolute right-4 top-1/2 -translate-y-1/2"
                      :class="
                        wageData.overtimeRates[field.enabledKey]
                          ? 'badge-primary font-bold'
                          : 'badge-ghost text-gray-400'
                      "
                      style="transition: all 0.2s; pointer-events: none"
                    >
                      {{ field.label }}
                    </span>
                  </div>
                </div>
                <div
                  :data-test="field.overtimeErrorTest"
                  class="text-red-500 text-sm w-full text-left"
                  v-for="error of v$.wageData.overtimeRates[field.amountKey].$errors"
                  :key="error.$uid"
                >
                  {{ error.$message }}
                </div>
              </div>
            </div>
          </div>

          <div
            data-test="overtime-rate-per-hour-error"
            class="text-red-500 text-sm w-full text-left"
            v-for="error of v$.overtimeRatePerHour.$errors"
            :key="error.$uid"
          >
            {{ error.$message }}
          </div>

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
                  v-for="summaryItem in standardRateSummary"
                  :key="summaryItem"
                  class="text-lg font-semibold text-base-content/80"
                >
                  {{ summaryItem }}
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
                  v-for="summaryItem in overtimeRateSummary"
                  :key="summaryItem"
                  class="text-lg font-semibold text-emerald-700"
                >
                  {{ summaryItem }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div v-if="setWageError" data-test="error-state">
          <div class="alert alert-error">
            {{
              (setWageError as AxiosError<{ message?: string }>).response?.data?.message ||
              'Error setting wage'
            }}
          </div>
        </div>

        <div class="modal-action justify-between w-full">
          <ButtonUI
            v-if="props.wage"
            :loading="isMemberWageSaving"
            :disabled="isMemberWageSaving"
            variant="error"
            size="lg"
            @click="handleResetWage"
            data-test="reset-wage-button"
          >
            Reset Wage
          </ButtonUI>
          <div class="ml-auto flex gap-3">
            <ButtonUI
              v-if="currentStep === 1"
              variant="error"
              outline
              size="lg"
              @click="handleCancel"
              data-test="add-wage-cancel-button"
            >
              Cancel
            </ButtonUI>
            <ButtonUI v-else outline size="lg" @click="handleBack" data-test="back-wage-button">
              ← Back
            </ButtonUI>
            <ButtonUI
              :loading="isMemberWageSaving"
              :disabled="isMemberWageSaving"
              variant="success"
              size="lg"
              @click="handleSaveWage"
              :data-test="currentStep === 1 ? 'add-wage-button' : 'save-overtime-wage-button'"
            >
              {{ currentStep === 1 && wageData.enableOvertimeRules ? 'Next →' : 'Save' }}
            </ButtonUI>
          </div>
        </div>
      </div>
    </ModalComponent>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import ButtonUI from '@/components/ButtonUI.vue'
import ModalComponent from '@/components/ModalComponent.vue'
import { useToastStore } from '@/stores'
import type { Member } from '@/types'
import { useVuelidate } from '@vuelidate/core'
import { numeric, required, helpers } from '@vuelidate/validators'
import { NETWORK } from '@/constant'
import { useSetMemberWageMutation } from '@/queries/wage.queries'
import type { AxiosError } from 'axios'
import type { RatePerHour, Wage } from '@/types'

const props = defineProps<{
  member: Partial<Member>
  teamId: number | string
  wage?: Wage
}>()

const emits = defineEmits<{ wageUpdated: [] }>()

const showModal = ref(false)
const currentStep = ref<1 | 2>(1)
const { addSuccessToast } = useToastStore()

type RateFormKey = 'hourlyRate' | 'hourlyRateUsdc' | 'hourlyRateToken'
type RateToggleKey = 'nativeEnabled' | 'usdcEnabled' | 'sherEnabled'

interface RateFormState {
  hourlyRate: number
  hourlyRateUsdc: number
  hourlyRateToken: number
  nativeEnabled: boolean
  usdcEnabled: boolean
  sherEnabled: boolean
}

interface WageFormState {
  maxWeeklyHours: number
  maximumOvertimeHoursPerWeek: number
  enableOvertimeRules: boolean
  standardRates: RateFormState
  overtimeRates: RateFormState
}

const rateFieldConfigs: Array<{
  key: string
  amountKey: RateFormKey
  enabledKey: RateToggleKey
  label: string
  activePlaceholder: string
  unitLabel: string
  standardInputTest: string
  standardToggleTest: string
  standardErrorTest: string
  overtimeInputTest: string
  overtimeToggleTest: string
  overtimeErrorTest: string
}> = [
  {
    key: 'native',
    amountKey: 'hourlyRate',
    enabledKey: 'nativeEnabled',
    label: NETWORK.currencySymbol,
    activePlaceholder: 'Native token rate...',
    unitLabel: `${NETWORK.currencySymbol}/hr`,
    standardInputTest: 'hourly-rate-input',
    standardToggleTest: 'toggle-hourly-rate-native',
    standardErrorTest: 'hourly-rate-error',
    overtimeInputTest: 'overtime-hourly-rate-input',
    overtimeToggleTest: 'toggle-overtime-rate-native',
    overtimeErrorTest: 'overtime-hourly-rate-error'
  },
  {
    key: 'usdc',
    amountKey: 'hourlyRateUsdc',
    enabledKey: 'usdcEnabled',
    label: 'USDC',
    activePlaceholder: 'USDC rate...',
    unitLabel: 'USDC/hr',
    standardInputTest: 'hourly-rate-usdc-input',
    standardToggleTest: 'toggle-hourly-rate-usdc',
    standardErrorTest: 'hourly-rate-usdc-error',
    overtimeInputTest: 'overtime-hourly-rate-usdc-input',
    overtimeToggleTest: 'toggle-overtime-rate-usdc',
    overtimeErrorTest: 'overtime-hourly-rate-usdc-error'
  },
  {
    key: 'sher',
    amountKey: 'hourlyRateToken',
    enabledKey: 'sherEnabled',
    label: 'SHER',
    activePlaceholder: 'SHER rate...',
    unitLabel: 'SHER/hr',
    standardInputTest: 'hourly-rate-sher-input',
    standardToggleTest: 'toggle-hourly-rate-sher',
    standardErrorTest: 'hourly-rate-sher-error',
    overtimeInputTest: 'overtime-hourly-rate-sher-input',
    overtimeToggleTest: 'toggle-overtime-rate-sher',
    overtimeErrorTest: 'overtime-hourly-rate-sher-error'
  }
]

const initializeRateForm = (rates?: RatePerHour[] | null): RateFormState => {
  const nativeRate = rates?.find((rate) => rate.type === 'native')?.amount ?? 0
  const usdcRate = rates?.find((rate) => rate.type === 'usdc')?.amount ?? 0
  const sherRate = rates?.find((rate) => rate.type === 'sher')?.amount ?? 0

  return {
    hourlyRate: nativeRate,
    hourlyRateUsdc: usdcRate,
    hourlyRateToken: sherRate,
    nativeEnabled: nativeRate > 0,
    usdcEnabled: usdcRate > 0,
    sherEnabled: sherRate > 0
  }
}

const createEmptyRateForm = (): RateFormState => ({
  hourlyRate: 0,
  hourlyRateUsdc: 0,
  hourlyRateToken: 0,
  nativeEnabled: false,
  usdcEnabled: false,
  sherEnabled: false
})

const initializeWageData = (): WageFormState => {
  const hasOvertime = Boolean(props.wage?.overtimeRatePerHour?.length)

  // maximumOvertimeHoursPerWeek is its own distinct field — never falls back to maximumHoursPerWeek.
  // Legacy records (null) are handled by getWages backfill on the backend side.
  const maximumOvertimeHoursPerWeek = hasOvertime
    ? (props.wage?.maximumOvertimeHoursPerWeek ?? 0)
    : 0

  return {
    maxWeeklyHours: props.wage?.maximumHoursPerWeek ?? 0,
    maximumOvertimeHoursPerWeek,
    enableOvertimeRules: hasOvertime,
    standardRates: initializeRateForm(props.wage?.ratePerHour),
    overtimeRates: initializeRateForm(props.wage?.overtimeRatePerHour)
  }
}

const createEmptyWageData = (): WageFormState => ({
  maxWeeklyHours: 0,
  maximumOvertimeHoursPerWeek: 0,
  enableOvertimeRules: false,
  standardRates: createEmptyRateForm(),
  overtimeRates: createEmptyRateForm()
})

const wageData = ref<WageFormState>(initializeWageData())

const buildRatePerHour = (rateState: RateFormState): RatePerHour[] => {
  return [
    ...(rateState.nativeEnabled && rateState.hourlyRate > 0
      ? [{ type: 'native', amount: Number(rateState.hourlyRate) } as RatePerHour]
      : []),
    ...(rateState.usdcEnabled && rateState.hourlyRateUsdc > 0
      ? [{ type: 'usdc', amount: Number(rateState.hourlyRateUsdc) } as RatePerHour]
      : []),
    ...(rateState.sherEnabled && rateState.hourlyRateToken > 0
      ? [{ type: 'sher', amount: Number(rateState.hourlyRateToken) } as RatePerHour]
      : [])
  ]
}

const standardRatePerHour = computed(() => buildRatePerHour(wageData.value.standardRates))
const overtimeRatePerHour = computed(() => buildRatePerHour(wageData.value.overtimeRates))

const notZero = helpers.withMessage('Amount must be greater than 0', (value: string) => {
  return parseFloat(value) > 0
})

const requiredOvertimeHours = helpers.withMessage(
  'Overtime hours must be greater than 0',
  (value: number) => !wageData.value.enableOvertimeRules || Number(value) > 0
)

const overtimeHoursMustBeInteger = helpers.withMessage(
  'Overtime hours must be a whole number',
  (value: number) => !wageData.value.enableOvertimeRules || Number.isInteger(Number(value))
)

const atLeastOneRate = helpers.withMessage(
  'At least one hourly rate must be set',
  (value: { type: string; amount: number }[]) => {
    return value.some((rate) => rate.amount > 0)
  }
)

const createEnabledRateValidator = (enabledKey: RateToggleKey, label: string) =>
  helpers.withMessage(
    `${label} rate must be greater than 0`,
    (value: number, siblings: RateFormState) => {
      return !siblings[enabledKey] || Number(value) > 0
    }
  )

const rules = computed(() => ({
  wageData: {
    maxWeeklyHours: {
      required,
      numeric,
      notZero
    },
    maximumOvertimeHoursPerWeek: {
      requiredOvertimeHours,
      overtimeHoursMustBeInteger
    },
    standardRates: {
      hourlyRate: {
        validRate: createEnabledRateValidator('nativeEnabled', NETWORK.currencySymbol)
      },
      hourlyRateUsdc: {
        validRate: createEnabledRateValidator('usdcEnabled', 'USDC')
      },
      hourlyRateToken: {
        validRate: createEnabledRateValidator('sherEnabled', 'SHER')
      }
    },
    overtimeRates: {
      hourlyRate: {
        validRate: createEnabledRateValidator('nativeEnabled', NETWORK.currencySymbol)
      },
      hourlyRateUsdc: {
        validRate: createEnabledRateValidator('usdcEnabled', 'USDC')
      },
      hourlyRateToken: {
        validRate: createEnabledRateValidator('sherEnabled', 'SHER')
      }
    }
  },
  standardRatePerHour: {
    atLeastOneRate
  },
  overtimeRatePerHour: wageData.value.enableOvertimeRules
    ? {
        atLeastOneRate
      }
    : {}
}))

const v$ = useVuelidate(rules, { wageData, standardRatePerHour, overtimeRatePerHour })

const {
  mutate: executeSetWage,
  isPending: isMemberWageSaving,
  error: setWageError
} = useSetMemberWageMutation()

const buildRateSummary = (rates: RatePerHour[]) => {
  return rateFieldConfigs
    .map((field) => {
      const rate = rates.find((item) => item.type === field.key)
      return rate ? `${rate.amount} ${field.unitLabel}` : null
    })
    .filter((value): value is string => Boolean(value))
}

const standardRateSummary = computed(() => buildRateSummary(standardRatePerHour.value))
const overtimeRateSummary = computed(() => buildRateSummary(overtimeRatePerHour.value))

const validateStepOne = () => {
  v$.value.wageData.maxWeeklyHours.$touch()
  v$.value.wageData.standardRates.$touch()
  v$.value.standardRatePerHour.$touch()

  return !(
    v$.value.wageData.maxWeeklyHours.$invalid ||
    v$.value.wageData.standardRates.$invalid ||
    v$.value.standardRatePerHour.$invalid
  )
}

const validateStepTwo = () => {
  if (!wageData.value.enableOvertimeRules) {
    return true
  }

  v$.value.wageData.overtimeRates.$touch()
  v$.value.wageData.maximumOvertimeHoursPerWeek.$touch()
  v$.value.overtimeRatePerHour.$touch()

  return !(
    v$.value.wageData.overtimeRates.$invalid ||
    v$.value.wageData.maximumOvertimeHoursPerWeek.$invalid ||
    v$.value.overtimeRatePerHour.$invalid
  )
}

const submitWage = () => {
  const parsedOvertimeHours = wageData.value.enableOvertimeRules
    ? parseInt(String(wageData.value.maximumOvertimeHoursPerWeek), 10)
    : null

  // Guard: should not reach here due to form validation, but safety net
  if (
    wageData.value.enableOvertimeRules &&
    (parsedOvertimeHours == null || Number.isNaN(parsedOvertimeHours) || parsedOvertimeHours <= 0)
  ) {
    console.error('maximumOvertimeHoursPerWeek is invalid — submission blocked')
    return
  }

  const payload = {
    teamId: props.teamId,
    userAddress: props.member.address || '',
    ratePerHour: standardRatePerHour.value,
    overtimeRatePerHour: wageData.value.enableOvertimeRules ? overtimeRatePerHour.value : null,
    maximumOvertimeHoursPerWeek: parsedOvertimeHours,
    maximumHoursPerWeek: Number(wageData.value.maxWeeklyHours)
  }

  executeSetWage(
    { body: payload },
    {
      onSuccess: () => {
        addSuccessToast('Member wage data set successfully')
        emits('wageUpdated')
        handleCancel()
      },
      onError: (error: AxiosError) => {
        console.error('Error setting member wage:', error)
      }
    }
  )
}

const handleSaveWage = async () => {
  if (currentStep.value === 1) {
    if (!validateStepOne()) return

    if (wageData.value.enableOvertimeRules) {
      currentStep.value = 2
      return
    }

    submitWage()
    return
  }

  if (!validateStepTwo()) return

  submitWage()
}

const resetFormState = () => {
  currentStep.value = 1
  wageData.value = initializeWageData()
  v$.value.$reset()
}

const handleResetWage = () => {
  currentStep.value = 1
  wageData.value = createEmptyWageData()
  v$.value.$reset()
}

const handleBack = () => {
  currentStep.value = 1
}

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
