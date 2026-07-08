import { computed, ref } from 'vue'
import { useToast } from '@nuxt/ui/composables'
import { type Address, isAddress, parseUnits } from 'viem'
import { z } from 'zod'
import { useVestingAddVestingWrite } from '@/composables/vesting/writes'
import { useVestingDateRange } from '@/composables/vesting/useVestingDateRange'
import { type VestingCreation } from '@/types/vesting'
import type { User } from '@/types'

// Share token (InvestorV1) decimals — the contract mints this token on release.
const VESTING_TOKEN_DECIMALS = 6

type CreateVestingEmit = (event: 'reload' | 'closeAddVestingModal') => void

// Form composable for creating a vesting schedule.
//
// Vesting is Officer-native (agreement-then-mint): creating a schedule moves no
// tokens — no owner balance check, no ERC20 allowance, no `approve`. A member
// can hold several schedules at once, so there is no duplicate guard either.
// This is a focused form flow — collect input, validate, issue one `addVesting`
// write. The releasable amount is minted from the team's InvestorV1 on `release`.
export function useCreateVesting(emit: CreateVestingEmit) {
  const toast = useToast()

  const {
    dateRange,
    calendarRange,
    isDatePickerOpen,
    duration,
    durationInDays,
    dateRangeLabel,
    onDateRangeChange
  } = useVestingDateRange()

  const member = ref({ name: '', address: '' })
  const cliff = ref(0)
  const totalAmount = ref(0)
  const showSummary = ref(false)
  const errorMessage = ref('')

  const vestingData = computed<VestingCreation>(() => ({
    member: member.value,
    startDate: dateRange.value?.[0] || new Date(),
    duration: duration.value,
    durationInDays: durationInDays.value,
    cliff: cliff.value,
    totalAmount: totalAmount.value
  }))

  const formState = computed(() => ({
    member: member.value,
    dateRange: dateRange.value,
    cliff: cliff.value,
    totalAmount: totalAmount.value
  }))

  const schema = computed(() =>
    z.object({
      member: z.object({
        address: z
          .string()
          .refine((v) => isAddress(v), { message: 'Please enter a valid Ethereum address.' })
      }),
      dateRange: z
        .array(z.instanceof(Date))
        .nullable()
        .refine((v) => v !== null && v.length === 2, { message: 'Date range is required.' }),
      cliff: z
        .number()
        .min(0)
        .refine((v) => v <= durationInDays.value, {
          message: 'Cliff cannot be greater than duration.'
        }),
      totalAmount: z.number().refine((v) => v >= 1, { message: 'Amount must be greater than 0.' })
    })
  )

  const handleSelectMember = (selectedMember: User) => {
    member.value = {
      name: selectedMember.name ?? '',
      address: selectedMember.address ?? ''
    }
  }

  const addVestingWrite = useVestingAddVestingWrite()

  const loading = computed(() => addVestingWrite.isPending.value)

  function handleDisplaySummary() {
    errorMessage.value = ''
    const result = schema.value.safeParse(formState.value)
    if (result.success) showSummary.value = true
  }

  function submit() {
    errorMessage.value = ''

    const startDate = dateRange.value?.[0] || new Date()
    const start = Math.floor(startDate.getTime() / 1000)
    const durationInSeconds = durationInDays.value * 24 * 60 * 60
    const cliffInSeconds = cliff.value * 24 * 60 * 60
    const totalAmountInUnits = parseUnits(totalAmount.value.toString(), VESTING_TOKEN_DECIMALS)

    addVestingWrite.mutate(
      {
        args: [
          member.value.address as Address,
          BigInt(start),
          BigInt(durationInSeconds),
          BigInt(cliffInSeconds),
          totalAmountInUnits
        ]
      },
      {
        onSuccess: () => {
          toast.add({ title: 'Vesting schedule created', color: 'success' })
          cliff.value = 0
          totalAmount.value = 0
          dateRange.value = null
          calendarRange.value = null
          member.value = { name: '', address: '' }
          duration.value = { years: 0, months: 0, days: 0 }
          showSummary.value = false
          errorMessage.value = ''
          emit('closeAddVestingModal')
          emit('reload')
        },
        onError: (err) => {
          errorMessage.value = 'Add vesting failed'
          console.error('add vesting error', err)
        }
      }
    )
  }

  return {
    member,
    cliff,
    totalAmount,
    calendarRange,
    isDatePickerOpen,
    showSummary,
    errorMessage,
    vestingData,
    formState,
    schema,
    dateRangeLabel,
    loading,
    handleSelectMember,
    onDateRangeChange,
    handleDisplaySummary,
    submit
  }
}
