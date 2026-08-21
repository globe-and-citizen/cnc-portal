import { computed, ref, type Ref } from 'vue'
import { useToast } from '@nuxt/ui/composables'
import { type Address, isAddress, parseUnits } from 'viem'
import { z } from 'zod'
import { useInvestorSymbol } from '@/composables/investor/reads'
import { useVestingAddVestingWrite } from '@/composables/vesting/writes'
import { combineDayAndTime } from '@/utils/dayUtils'
import { formatTimeOfDay } from '@/utils/format'
import {
  addVestingMonths,
  classifyError,
  formatVestingDuration,
  nextVestingMinute,
  vestingMinutesBetween
} from '@/utils'
import { type VestingCreation } from '@/types/vesting'
import type { User } from '@/types'

const VESTING_TOKEN_DECIMALS = 6
const ONE_MINUTE_MS = 60_000

type CreateVestingEmit = (event: 'reload' | 'closeAddVestingModal') => void
type FeedbackColor = 'error' | 'warning'

/** Form orchestration for the configure → review → on-chain creation flow. */
export function useCreateVesting(emit: CreateVestingEmit) {
  const toast = useToast()
  const initialStart = nextVestingMinute()

  const member = ref({ name: '', address: '' })
  const totalAmount = ref('')
  const startDay = ref<Date | null>(initialStart)
  const startTime = ref(formatTimeOfDay(initialStart))
  const endDay = ref<Date | null>(null)
  const endTime = ref('')
  const cliffDay = ref<Date | null>(null)
  const cliffTime = ref('')
  const noCliff = ref(true)
  const durationPresetMonths = ref<number | null>(null)
  const cliffPresetMonths = ref<number | null>(0)
  const showSummary = ref(false)
  const errorMessage = ref('')
  const feedbackColor = ref<FeedbackColor>('error')

  const startAt = computed(() => boundaryValue(startDay.value, startTime.value))
  const endAt = computed(() => boundaryValue(endDay.value, endTime.value))
  const selectedCliffAt = computed(() => boundaryValue(cliffDay.value, cliffTime.value))
  const cliffEndAt = computed(() => (noCliff.value ? startAt.value : selectedCliffAt.value))
  const durationMinutes = computed(() => vestingMinutesBetween(startAt.value, endAt.value))
  const cliffMinutes = computed(() =>
    noCliff.value ? 0 : vestingMinutesBetween(startAt.value, cliffEndAt.value)
  )
  const durationLabel = computed(() => formatVestingDuration(startAt.value, endAt.value))
  const cliffDurationLabel = computed(() =>
    noCliff.value ? 'No cliff' : formatVestingDuration(startAt.value, cliffEndAt.value)
  )

  const { data: investorSymbol } = useInvestorSymbol()
  const tokenSymbol = computed(() =>
    typeof investorSymbol.value === 'string' && investorSymbol.value.trim()
      ? investorSymbol.value
      : 'SHARES'
  )

  const vestingData = computed<VestingCreation | null>(() => {
    if (!startAt.value || !endAt.value || !cliffEndAt.value) return null
    return {
      member: member.value,
      totalAmount: totalAmount.value,
      tokenSymbol: tokenSymbol.value,
      startAt: startAt.value,
      endAt: endAt.value,
      cliffEndAt: cliffEndAt.value,
      durationMinutes: durationMinutes.value,
      cliffMinutes: cliffMinutes.value,
      noCliff: noCliff.value
    }
  })

  const formState = computed(() => ({
    memberAddress: member.value.address,
    totalAmount: totalAmount.value,
    startAt: startAt.value,
    endAt: endAt.value,
    cliffEndAt: cliffEndAt.value
  }))

  const schema = computed(() =>
    z
      .object({
        memberAddress: z
          .string()
          .refine((value) => isAddress(value), { message: 'Choose a valid team member.' }),
        totalAmount: z
          .string()
          .trim()
          .min(1, 'Enter the total number of shares.')
          .regex(/^\d+(\.\d{1,6})?$/, 'Use a positive amount with up to 6 decimals.')
          .refine((value) => Number(value) > 0, 'Amount must be greater than 0.'),
        startAt: z.date().nullable(),
        endAt: z.date().nullable(),
        cliffEndAt: z.date().nullable()
      })
      .superRefine((value, context) => {
        if (!value.startAt) {
          context.addIssue({
            code: 'custom',
            path: ['startAt'],
            message: 'Choose a start date and time.'
          })
        }
        if (!value.endAt) {
          context.addIssue({
            code: 'custom',
            path: ['endAt'],
            message: 'Choose an end date and time.'
          })
        }
        if (!value.cliffEndAt) {
          context.addIssue({
            code: 'custom',
            path: ['cliffEndAt'],
            message: 'Choose when the cliff ends.'
          })
        }
        if (!value.startAt || !value.endAt || !value.cliffEndAt) return

        if (value.endAt.getTime() - value.startAt.getTime() < ONE_MINUTE_MS) {
          context.addIssue({
            code: 'custom',
            path: ['endAt'],
            message: 'End must be at least one minute after start.'
          })
        }
        if (value.cliffEndAt < value.startAt || value.cliffEndAt > value.endAt) {
          context.addIssue({
            code: 'custom',
            path: ['cliffEndAt'],
            message: 'Cliff end must be between the start and end.'
          })
        }
      })
  )

  function handleSelectMember(selectedMember: User) {
    member.value = {
      name: selectedMember.name ?? '',
      address: selectedMember.address ?? ''
    }
  }

  function clearMember() {
    member.value = { name: '', address: '' }
  }

  function updateBoundary(day: Ref<Date | null>, time: Ref<string>, value: Date) {
    day.value = value
    time.value = formatTimeOfDay(value)
  }

  function syncPresetBoundaries() {
    if (!startAt.value) return
    if (durationPresetMonths.value !== null) {
      updateBoundary(endDay, endTime, addVestingMonths(startAt.value, durationPresetMonths.value))
    }
    if (!noCliff.value && cliffPresetMonths.value !== null) {
      updateBoundary(cliffDay, cliffTime, addVestingMonths(startAt.value, cliffPresetMonths.value))
    }
  }

  function setStartDay(value: Date) {
    startDay.value = value
    syncPresetBoundaries()
  }

  function setStartTime(value: string) {
    startTime.value = value
    syncPresetBoundaries()
  }

  function setEndDay(value: Date) {
    endDay.value = value
    durationPresetMonths.value = null
  }

  function setEndTime(value: string) {
    endTime.value = value
    durationPresetMonths.value = null
  }

  function setCliffDay(value: Date) {
    cliffDay.value = value
    cliffPresetMonths.value = null
    noCliff.value = false
  }

  function setCliffTime(value: string) {
    cliffTime.value = value
    cliffPresetMonths.value = null
    noCliff.value = false
  }

  function selectDurationPreset(months: number) {
    durationPresetMonths.value = months
    if (startAt.value) {
      updateBoundary(endDay, endTime, addVestingMonths(startAt.value, months))
    }
  }

  function selectCliffPreset(months: number | null) {
    if (months === 0) {
      noCliff.value = true
      cliffPresetMonths.value = 0
      cliffDay.value = null
      cliffTime.value = ''
      return
    }

    noCliff.value = false
    cliffPresetMonths.value = months
    if (!startAt.value) return

    updateBoundary(cliffDay, cliffTime, addVestingMonths(startAt.value, months ?? 0))
  }

  function handleDisplaySummary() {
    errorMessage.value = ''
    if (schema.value.safeParse(formState.value).success) showSummary.value = true
  }

  const addVestingWrite = useVestingAddVestingWrite()
  const loading = computed(() => addVestingWrite.isPending.value)

  async function submit() {
    errorMessage.value = ''
    feedbackColor.value = 'error'
    const data = vestingData.value
    if (!data) return

    try {
      await addVestingWrite.mutateAsync({
        args: [
          data.member.address as Address,
          BigInt(Math.floor(data.startAt.getTime() / 1000)),
          BigInt(data.durationMinutes * 60),
          BigInt(data.cliffMinutes * 60),
          parseUnits(data.totalAmount, VESTING_TOKEN_DECIMALS)
        ]
      })

      toast.add({ title: 'Vesting schedule created', color: 'success' })
      resetForm()
      emit('closeAddVestingModal')
      emit('reload')
    } catch (error) {
      const classified = classifyError(error, { contract: 'Vesting' })
      if (classified.category === 'user_rejected') {
        feedbackColor.value = 'warning'
        errorMessage.value = 'The wallet request was cancelled. No schedule was created.'
        return
      }
      errorMessage.value = classified.userMessage
    }
  }

  function resetForm() {
    const newStart = nextVestingMinute()
    member.value = { name: '', address: '' }
    totalAmount.value = ''
    startDay.value = newStart
    startTime.value = formatTimeOfDay(newStart)
    endDay.value = null
    endTime.value = ''
    cliffDay.value = null
    cliffTime.value = ''
    noCliff.value = true
    durationPresetMonths.value = null
    cliffPresetMonths.value = 0
    showSummary.value = false
    errorMessage.value = ''
    addVestingWrite.reset()
  }

  return {
    member,
    totalAmount,
    startDay,
    startTime,
    endDay,
    endTime,
    cliffDay,
    cliffTime,
    noCliff,
    startAt,
    endAt,
    cliffEndAt,
    durationPresetMonths,
    cliffPresetMonths,
    durationLabel,
    cliffDurationLabel,
    tokenSymbol,
    showSummary,
    errorMessage,
    feedbackColor,
    vestingData,
    formState,
    schema,
    loading,
    handleSelectMember,
    clearMember,
    setStartDay,
    setStartTime,
    setEndDay,
    setEndTime,
    setCliffDay,
    setCliffTime,
    selectDurationPreset,
    selectCliffPreset,
    handleDisplaySummary,
    submit
  }
}

function boundaryValue(day: Date | null, time: string): Date | null {
  if (!day || !time) return null
  return combineDayAndTime(day, time)
}
