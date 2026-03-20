import { computed, ref } from 'vue'
import { useVuelidate } from '@vuelidate/core'
import { numeric, required, helpers } from '@vuelidate/validators'
import { NETWORK, RATE_FIELD_CONFIGS } from '@/constant'
import { useSetMemberWageMutation } from '@/queries/wage.queries'
import { useToastStore } from '@/stores'
import type { RatePerHour, Wage, RateFormState, WageFormState, RateToggleKey } from '@/types'
import type { AxiosError } from 'axios'

export interface UseWageFormOptions {
  wage: () => Wage | undefined
  teamId: () => number | string
  memberAddress: () => string
  onSuccess: () => void
}

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

const buildRateSummary = (rates: RatePerHour[]) => {
  return RATE_FIELD_CONFIGS.map((field) => {
    const rate = rates.find((item) => item.type === field.key)
    return rate ? `${rate.amount} ${field.unitLabel}` : null
  }).filter((value): value is string => Boolean(value))
}

const createEnabledRateValidator = (enabledKey: RateToggleKey, label: string) =>
  helpers.withMessage(
    `${label} rate must be greater than 0`,
    (value: number, siblings: RateFormState) => {
      return !siblings[enabledKey] || Number(value) > 0
    }
  )

export function useWageForm(options: UseWageFormOptions) {
  const { addSuccessToast } = useToastStore()

  const currentStep = ref<1 | 2>(1)

  const initializeWageData = (): WageFormState => {
    const wage = options.wage()
    const hasOvertime = Boolean(wage?.overtimeRatePerHour?.length)

    // maximumOvertimeHoursPerWeek is its own distinct field — never falls back to maximumHoursPerWeek.
    // Legacy records (null) are handled by getWages backfill on the backend side.
    const maximumOvertimeHoursPerWeek = hasOvertime ? (wage?.maximumOvertimeHoursPerWeek ?? 0) : 0

    return {
      maxWeeklyHours: wage?.maximumHoursPerWeek ?? 0,
      maximumOvertimeHoursPerWeek,
      enableOvertimeRules: hasOvertime,
      standardRates: initializeRateForm(wage?.ratePerHour),
      overtimeRates: initializeRateForm(wage?.overtimeRatePerHour)
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

  // --- Computed rate builders ---
  const standardRatePerHour = computed(() => buildRatePerHour(wageData.value.standardRates))
  const overtimeRatePerHour = computed(() => buildRatePerHour(wageData.value.overtimeRates))

  // --- Rate summaries ---
  const standardRateSummary = computed(() => buildRateSummary(standardRatePerHour.value))
  const overtimeRateSummary = computed(() => buildRateSummary(overtimeRatePerHour.value))

  // --- Validators ---
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

  // --- Validation rules ---
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

  // --- Mutation ---
  const {
    mutate: executeSetWage,
    isPending: isMemberWageSaving,
    error: setWageError
  } = useSetMemberWageMutation()

  // --- Step validation ---
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

  // --- Submission ---
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
      teamId: options.teamId(),
      userAddress: options.memberAddress(),
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
          options.onSuccess()
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

  // --- Reset / Navigation ---
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

  return {
    wageData,
    currentStep,
    v$,
    standardRatePerHour,
    overtimeRatePerHour,
    standardRateSummary,
    overtimeRateSummary,
    isMemberWageSaving,
    setWageError,
    rateFieldConfigs: RATE_FIELD_CONFIGS,
    handleSaveWage,
    handleBack,
    handleResetWage,
    resetFormState
  }
}
