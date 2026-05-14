<template>
  <UForm
    v-if="!showSummary"
    :schema="schema"
    :state="formState"
    class="flex w-full max-w-5xl flex-col gap-5"
    @submit="handleDisplaySummary"
  >
    <h4 class="text-lg font-bold">Create Vesting Schedule</h4>

    <UAlert
      v-if="errorMessage"
      color="error"
      variant="soft"
      icon="i-lucide-circle-alert"
      :description="errorMessage"
      data-test="error-alert"
    />

    <UFormField name="member" label="Choose Member" class="mt-4 gap-2">
      <div v-if="member.address" class="h-20">
        <UserComponent
          class="bg-base-200 grow rounded-lg p-4"
          :user="member"
          data-test="selected-member"
        />
      </div>
      <div class="flex w-full grow">
        <SelectMemberInput
          data-test="member"
          class="w-full text-xs"
          :hidden-members="[]"
          :disable-team-members="false"
          showOnFocus
          only-team-members
          @selectMember="handleSelectMember"
        />
      </div>
    </UFormField>

    <UFormField name="dateRange" label="Period" class="mt-4">
      <UPopover v-model:open="isDatePickerOpen">
        <UButton
          type="button"
          color="neutral"
          variant="outline"
          class="w-full justify-start"
          icon="i-lucide-calendar"
          data-test="date-range"
        >
          {{ dateRangeLabel }}
        </UButton>
        <template #content>
          <UCalendar
            range
            :number-of-months="1"
            :model-value="calendarRange"
            class="p-2"
            @update:model-value="onDateRangeChange"
          />
        </template>
      </UPopover>
    </UFormField>

    <div class="mt-4 flex w-full items-start gap-3">
      <UFormField name="totalAmount" label="Amount" class="min-w-0 flex-1">
        <UInput
          data-test="total-amount"
          type="number"
          class="w-full"
          :model-value="totalAmount"
          @update:model-value="(v: string | number) => (totalAmount = Number(v))"
          :required="true"
        />
      </UFormField>
      <UFormField name="cliff" label="Cliff (days)" class="min-w-0 flex-1">
        <UInput
          data-test="cliff"
          type="number"
          class="w-full"
          :model-value="cliff"
          @update:model-value="(v: string | number) => (cliff = Number(v))"
          :required="true"
        />
      </UFormField>
    </div>

    <h3 class="pt-6 text-sm text-gray-600">
      By clicking "Create Vesting", you agree to lock this token amount under a vesting schedule.
      Ensure your contract is approved to transfer these tokens.
    </h3>
    <div class="modal-action justify-end">
      <UButton
        type="button"
        color="primary"
        size="sm"
        @click="handleDisplaySummary"
        :disabled="loading"
        :loading="loading"
        data-test="submit-btn"
        label="Create Vesting"
      />
    </div>
  </UForm>
  <div v-if="showSummary" class="flex flex-col gap-3">
    <UAlert
      v-if="errorMessage"
      color="error"
      variant="soft"
      icon="i-lucide-circle-alert"
      :description="errorMessage"
      data-test="summary-error-alert"
    />
    <VestingSummary
      :vesting="vestingData"
      :loading="loading"
      @back="showSummary = false"
      @confirm="approveAllowance"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, shallowRef, watch } from 'vue'
import { differenceInCalendarDays, differenceInMonths, differenceInYears } from '@/utils/dayUtils'
import { type Address, formatUnits, parseUnits } from 'viem'
import SelectMemberInput from '@/components/utils/SelectMemberInput.vue'
import UserComponent from '@/components/UserComponent.vue'
import VestingSummary from '@/components/sections/VestingView/VestingSummary.vue'
import { useTeamStore } from '@/stores'
import {
  useVestingAddress,
  useVestingGetTeamVestingsWithMembers
} from '@/composables/vesting/reads'
import { useVestingAddVestingWrite } from '@/composables/vesting/writes'
import { type VestingCreation } from '@/types/vesting'
import type { User } from '@/types'
import { useContractBalance } from '@/composables/useContractBalance'
import { useErc20Allowance, useErc20BalanceOf } from '@/composables/erc20/reads'
import { useERC20Approve } from '@/composables/erc20/writes'
import { useUserDataStore } from '@/stores'
import { isAddress } from 'viem'
import { z } from 'zod'
import type { DateRange } from 'reka-ui'

const toast = useToast()

const props = defineProps<{
  tokenAddress: string
  reloadKey: number
}>()

const VESTING_TOKEN_DECIMALS = 6

const userDataStore = useUserDataStore()
const { balances } = useContractBalance(userDataStore.address as Address)
const teamStore = useTeamStore()
const vestingData = computed<VestingCreation>(() => ({
  member: member.value,
  startDate: dateRange.value?.[0] || new Date(),
  duration: duration.value,
  durationInDays: durationInDays.value,
  cliff: cliff.value,
  totalAmount: totalAmount.value
}))

const tokenBalance = computed(() => {
  return balances.value.find(
    (b) => b.token.address?.toLowerCase() === props.tokenAddress.toLowerCase()
  )
})

const vestingTokenAddress = computed(() => props.tokenAddress as Address)
const connectedUserAddress = computed(() => userDataStore.address as Address)
const vestingAddressResult = useVestingAddress()
const vestingAddress = computed(() => vestingAddressResult.value as Address)

const { data: connectedUserVestingBalanceRaw, error: connectedUserVestingBalanceError } =
  useErc20BalanceOf(vestingTokenAddress, connectedUserAddress)

watch(connectedUserVestingBalanceError, () => {
  if (connectedUserVestingBalanceError.value) {
    toast.add({ title: 'Error fetching connected user token balance', color: 'error' })
    console.error('connected user balance error', connectedUserVestingBalanceError.value)
  }
})

const connectedUserTokenBalance = computed<number | undefined>(() => {
  if (typeof connectedUserVestingBalanceRaw.value === 'bigint') {
    return Number(formatUnits(connectedUserVestingBalanceRaw.value, VESTING_TOKEN_DECIMALS))
  }
  return tokenBalance.value?.amount
})

const connectedUserTokenBalanceUnits = computed<bigint | undefined>(() => {
  if (typeof connectedUserVestingBalanceRaw.value === 'bigint') {
    return connectedUserVestingBalanceRaw.value
  }
  if (typeof tokenBalance.value?.amount === 'number') {
    return parseUnits(tokenBalance.value.amount.toString(), VESTING_TOKEN_DECIMALS)
  }
  return undefined
})

const activeMembers = computed<string[]>(() => {
  if (!Array.isArray(vestingInfos.value) || vestingInfos.value.length !== 2) {
    return []
  }

  const [members] = vestingInfos.value
  return Array.isArray(members)
    ? members.filter((member): member is string => typeof member === 'string')
    : []
})

const member = ref({ name: '', address: '' })
const cliff = ref(0)
const totalAmount = ref(0)
const dateRange = ref<[Date, Date] | null>(null)
// Keep calendar values in a shallow ref to preserve DateValue nominal types.
const calendarRange = shallowRef<DateRange | null>(null)
const isDatePickerOpen = ref(false)
const duration = ref({ years: 0, months: 0, days: 0 })
const durationInDays = ref(0)
const showSummary = ref(false)
const errorMessage = ref('')

const formState = computed(() => ({
  member: member.value,
  dateRange: dateRange.value,
  cliff: cliff.value,
  totalAmount: totalAmount.value
}))

const schema = computed(() => {
  const connectedUserBalance = connectedUserTokenBalance.value

  return z.object({
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
    totalAmount: z
      .number()
      .refine((v) => v >= 1, { message: 'Amount must be greater than 0.' })
      .refine(
        (v) =>
          typeof connectedUserBalance !== 'number' ||
          Number.isNaN(connectedUserBalance) ||
          v <= connectedUserBalance,
        {
          message: `Insufficient Investor token balance`
        }
      )
  })
})

const handleSelectMember = (selectedMember: User) => {
  member.value = {
    name: selectedMember.name ?? '',
    address: selectedMember.address ?? ''
  }
}

interface CalendarDateLike {
  year: number
  month: number
  day: number
}

const isCalendarDateLike = (value: unknown): value is CalendarDateLike => {
  if (!value || typeof value !== 'object') return false

  const parsed = value as Record<string, unknown>
  return (
    typeof parsed.year === 'number' &&
    typeof parsed.month === 'number' &&
    typeof parsed.day === 'number'
  )
}

const calendarDateToDate = (value: CalendarDateLike): Date =>
  new Date(value.year, value.month - 1, value.day)

const formatDate = (value: Date): string => value.toLocaleDateString('en-GB')

const dateRangeLabel = computed(() => {
  if (!dateRange.value) return 'Select range'
  return `${formatDate(dateRange.value[0])} - ${formatDate(dateRange.value[1])}`
})

const onDateRangeChange = (value: DateRange | null) => {
  calendarRange.value = value

  if (
    !value?.start ||
    !value?.end ||
    !isCalendarDateLike(value.start) ||
    !isCalendarDateLike(value.end)
  ) {
    dateRange.value = null
    return
  }

  dateRange.value = [calendarDateToDate(value.start), calendarDateToDate(value.end)]
  isDatePickerOpen.value = false
}

watch(dateRange, (val) => {
  if (!val || val.length !== 2) {
    calendarRange.value = null
    durationInDays.value = 0
    duration.value = { years: 0, months: 0, days: 0 }
    return
  }

  const [start, end] = val

  const days = differenceInCalendarDays(end, start)
  if (days < 0) {
    durationInDays.value = 0
    duration.value = { years: 0, months: 0, days: 0 }
    return
  }

  const years = differenceInYears(end, start)
  const months = differenceInMonths(end, start) % 12
  const leftoverDays = days - years * 365 - months * 30
  durationInDays.value = days
  duration.value = { years, months, days: leftoverDays }
})

const emit = defineEmits(['reload', 'closeAddVestingModal'])

const {
  data: vestingInfos,
  error: errorGetVestingInfo,
  refetch: getVestingInfos
} = useVestingGetTeamVestingsWithMembers(computed(() => BigInt(teamStore.currentTeamId ?? 0)))
watch(errorGetVestingInfo, () => {
  if (errorGetVestingInfo.value) {
    toast.add({ title: 'Add admin failed', color: 'error' })
  }
})

watch(
  () => props.reloadKey,
  async () => {
    await getVestingInfos()
  }
)

const loading = computed(() => approveTokenWrite.isPending.value || addVestingWrite.isPending.value)

const {
  data: allowance,
  refetch: getAllowance,
  error: allowanceError
} = useErc20Allowance(vestingTokenAddress, connectedUserAddress, vestingAddress)

watch(allowanceError, () => {
  if (allowanceError.value) {
    toast.add({ title: 'error on get Allowance', color: 'error' })
    console.error('allowance error ', allowanceError.value)
  }
})

const addVestingWrite = useVestingAddVestingWrite()

const approvalAmountUnits = ref<bigint>(0n)
const approveTokenWrite = useERC20Approve(vestingTokenAddress)

function checkDuplicateVesting() {
  if (
    member.value.address &&
    activeMembers.value.some((m) => m.toLowerCase() === member.value.address.toLowerCase())
  ) {
    errorMessage.value = 'The member address already has an active vesting.'
    return true
  }
  return false
}

async function approveAllowance() {
  errorMessage.value = ''
  if (!checkDuplicateVesting()) {
    const vestingSpender = vestingAddressResult.value
    if (!vestingSpender || !isAddress(vestingSpender)) {
      errorMessage.value = 'Invalid vesting contract address'
      return
    }

    if (totalAmount.value > 0) {
      approvalAmountUnits.value = parseUnits(totalAmount.value.toString(), VESTING_TOKEN_DECIMALS)
      approveTokenWrite.mutate(
        { args: [vestingSpender, approvalAmountUnits.value] },
        {
          onSuccess: () => {
            toast.add({ title: 'Approval added successfully', color: 'success' })
            submit()
          },
          onError: (err) => {
            errorMessage.value = 'Approval failed'
            console.error('Approval error ', err)
          }
        }
      )
    } else {
      errorMessage.value = 'total amount value should be greater than zero'
    }
  }
}

function handleDisplaySummary() {
  errorMessage.value = ''
  const result = schema.value.safeParse(formState.value)
  if (result.success) showSummary.value = true
}

async function submit() {
  if (checkDuplicateVesting()) return
  const startDate = dateRange.value?.[0] || new Date()
  const start = Math.floor(startDate.getTime() / 1000)
  const durationInSeconds = durationInDays.value * 24 * 60 * 60
  const cliffInSeconds = cliff.value * 24 * 60 * 60
  const totalAmountInUnits = parseUnits(totalAmount.value.toString(), VESTING_TOKEN_DECIMALS)

  const balanceInUnits = connectedUserTokenBalanceUnits.value
  if (balanceInUnits !== undefined && balanceInUnits < totalAmountInUnits) {
    errorMessage.value = 'Insufficient token balance'
    return
  }

  await getAllowance()
  if (typeof allowance.value === 'bigint' && allowance.value < totalAmountInUnits) {
    errorMessage.value = 'Allowance is less than the total amount'
    return
  }
  addVestingWrite.mutate(
    {
      args: [
        BigInt(teamStore.currentTeamId ?? 0),
        member.value.address as Address,
        BigInt(start),
        BigInt(durationInSeconds),
        BigInt(cliffInSeconds),
        totalAmountInUnits,
        props.tokenAddress as Address
      ]
    },
    {
      onSuccess: () => {
        toast.add({ title: 'vesting added successfully', color: 'success' })
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
</script>
