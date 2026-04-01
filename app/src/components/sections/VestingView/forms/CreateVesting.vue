<template>
  <div v-if="!showSummary" class="flex w-full max-w-5xl flex-col gap-5">
    <h4 class="text-lg font-bold">Create Vesting Schedule</h4>
    <div class="mt-4 gap-2">
      <label class="flex-col items-center gap-2">
        <div class="mb-3 flex w-32">Choose Member</div>
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
      </label>
      <span v-if="errors.member" class="mt-1 text-xs text-red-500">{{ errors.member }}</span>
    </div>

    <div class="mt-4 gap-2">
      <label class="flex items-center">
        <span class="w-32 shrink-0">Period</span>
        <div class="grow">
          <Datepicker
            v-model="dateRange"
            data-test="date-range"
            range
            auto-apply
            format="dd/MM/yyyy"
            placeholder="Select range"
            class="w-full"
          />
        </div>
      </label>
      <span v-if="errors.dateRange" class="text-xs text-red-500">{{ errors.dateRange }}</span>
    </div>

    <div class="mt-4 flex w-100 flex-wrap gap-3">
      <div class="min-w-50 flex-1">
        <label class="input input-bordered input-md flex w-full items-center gap-2">
          <span class="shrink-0 text-xs">Amount</span>
          <UInput
            data-test="total-amount"
            type="number"
            class="grow border-none shadow-none"
            :model-value="totalAmount"
            @update:model-value="(v: string | number) => (totalAmount = Number(v))"
            required
          />
        </label>
        <span v-if="errors.totalAmount" class="mt-1 block text-xs text-red-500">
          {{ errors.totalAmount }}
        </span>
      </div>
      <div class="min-w-50 flex-1">
        <label class="input input-bordered flex w-full items-center gap-2">
          <span class="shrink-0 text-xs">Cliff(days)</span>
          <UInput
            data-test="cliff"
            type="number"
            class="grow border-none text-sm shadow-none"
            :model-value="cliff"
            @update:model-value="(v: string | number) => (cliff = Number(v))"
            required
          />
        </label>
        <span v-if="errors.cliff" class="mt-1 block text-xs text-red-500">
          {{ errors.cliff }}
        </span>
      </div>
    </div>

    <h3 class="pt-6 text-sm text-gray-600">
      By clicking "Create Vesting", you agree to lock this token amount under a vesting schedule.
      Ensure your contract is approved to transfer these tokens.
    </h3>
    <div class="modal-action justify-end">
      <UButton
        color="primary"
        size="sm"
        @click="handleDisplaySummary"
        :disabled="loading"
        :loading="loading"
        data-test="submit-btn"
        label="Create Vesting"
      />
    </div>
  </div>
  <div v-if="showSummary">
    <VestingSummary
      :vesting="vestingData"
      :loading="loading"
      @back="showSummary = false"
      @confirm="approveAllowance"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { differenceInCalendarDays, differenceInMonths, differenceInYears } from '@/utils/dayUtils'
import { useWaitForTransactionReceipt, useWriteContract, useReadContract } from '@wagmi/vue'
import { VESTING_ABI } from '@/artifacts/abi/vesting'
import { VESTING_ADDRESS } from '@/constant'
import { type Address, formatUnits, parseUnits } from 'viem'
import SelectMemberInput from '@/components/utils/SelectMemberInput.vue'
import UserComponent from '@/components/UserComponent.vue'
import VestingSummary from '@/components/sections/VestingView/VestingSummary.vue'
import { useTeamStore } from '@/stores'
import Datepicker from '@vuepic/vue-datepicker'
import '@vuepic/vue-datepicker/dist/main.css'
import { type VestingCreation } from '@/types/vesting'
import type { User } from '@/types'
import { useContractBalance } from '@/composables/useContractBalance'
import { INVESTOR_ABI } from '@/artifacts/abi/investors'
import { useUserDataStore } from '@/stores'
import { isAddress } from 'viem'
import { z } from 'zod'

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

const { data: connectedUserVestingBalanceRaw, error: connectedUserVestingBalanceError } =
  useReadContract({
    abi: INVESTOR_ABI,
    address: vestingTokenAddress,
    functionName: 'balanceOf',
    args: [connectedUserAddress],
    query: {
      enabled: computed(
        () => isAddress(vestingTokenAddress.value) && isAddress(connectedUserAddress.value)
      )
    }
  })

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
const startDate = ref('')
const cliff = ref(0)
const totalAmount = ref(0)
const dateRange = ref<[Date, Date] | null>(null)
const duration = ref({ years: 0, months: 0, days: 0 })
const durationInDays = ref(0)
const updateCount = ref(0)
const showSummary = ref(false)

const errors = reactive({ member: '', dateRange: '', totalAmount: '', cliff: '' })
const emptyErrors = { member: '', dateRange: '', totalAmount: '', cliff: '' }

const handleSelectMember = (selectedMember: User) => {
  member.value = {
    name: selectedMember.name ?? '',
    address: selectedMember.address ?? ''
  }
  errors.member = ''
}

async function resetUpdateCount() {
  await nextTick()
  updateCount.value = 0
}

watch(dateRange, async (val) => {
  if (!val || val.length !== 2) return

  if (updateCount.value > 2) return

  const [start, end] = val
  const days = differenceInCalendarDays(end, start)
  const years = differenceInYears(end, start)
  const months = differenceInMonths(end, start) % 12
  const leftoverDays = days - years * 365 - months * 30
  durationInDays.value = days
  duration.value = { years, months, days: leftoverDays }

  updateCount.value++
  if (updateCount.value === 2) await resetUpdateCount()
})

const emit = defineEmits(['reload', 'closeAddVestingModal'])

const {
  data: vestingInfos,
  error: errorGetVestingInfo,
  refetch: getVestingInfos
} = useReadContract({
  functionName: 'getTeamVestingsWithMembers',
  address: VESTING_ADDRESS as Address,
  abi: VESTING_ABI,
  args: [BigInt(teamStore.currentTeamId ?? 0)]
})
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

const loading = computed(() => {
  const tokenApprovalPending =
    loadingApproveToken.value || (isConfirmingApproveToken.value && !isConfirmedApproveToken.value)
  const vestingCreationPending =
    loadingAddVesting.value || (isConfirmingAddVesting.value && !isConfirmedAddVesting.value)

  return tokenApprovalPending || vestingCreationPending
})

const {
  data: allowance,
  refetch: getAllowance,
  error: allowanceError
} = useReadContract({
  abi: INVESTOR_ABI,
  address: props.tokenAddress as Address,
  functionName: 'allowance',
  args: [userDataStore.address as Address, VESTING_ADDRESS as Address]
})

watch(allowanceError, () => {
  if (allowanceError.value) {
    toast.add({ title: 'error on get Allowance', color: 'error' })
    console.error('allowance error ', allowanceError.value)
  }
})

const {
  mutate: addVesting,
  error: errorAddVesting,
  isPending: loadingAddVesting,
  data: hashAddVesting
} = useWriteContract()

const { isLoading: isConfirmingAddVesting, isSuccess: isConfirmedAddVesting } =
  useWaitForTransactionReceipt({
    hash: hashAddVesting
  })

watch(isConfirmingAddVesting, async (isConfirming, wasConfirming) => {
  if (wasConfirming && !isConfirming && isConfirmedAddVesting.value) {
    toast.add({ title: 'vesting added successfully', color: 'success' })
    startDate.value = ''
    cliff.value = 0
    totalAmount.value = 0
    dateRange.value = null
    member.value = { name: '', address: '' }
    duration.value = { years: 0, months: 0, days: 0 }
    showSummary.value = false
    emit('closeAddVestingModal')
    emit('reload')
  }
})

watch(errorAddVesting, () => {
  if (errorAddVesting.value) {
    toast.add({ title: 'Add vesting failed', color: 'error' })
    console.error('add vesting error', errorAddVesting.value)
  }
})

const {
  mutate: approveToken,
  error: errorApproveToken,
  isPending: loadingApproveToken,
  data: hashApproveToken
} = useWriteContract()

const { isLoading: isConfirmingApproveToken, isSuccess: isConfirmedApproveToken } =
  useWaitForTransactionReceipt({
    hash: hashApproveToken
  })

watch(isConfirmingApproveToken, async (isConfirming, wasConfirming) => {
  if (wasConfirming && !isConfirming && isConfirmedApproveToken.value) {
    toast.add({ title: 'Approval added successfully', color: 'success' })
    submit()
  }
})

watch(errorApproveToken, () => {
  if (errorApproveToken.value) {
    toast.add({ title: 'Approval failed', color: 'error' })
    console.error('Approval error ', errorApproveToken.value)
  }
})

function buildSchema() {
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
}

function validate(): boolean {
  const result = buildSchema().safeParse({
    member: member.value,
    dateRange: dateRange.value,
    cliff: cliff.value,
    totalAmount: totalAmount.value
  })

  const nextErrors = { ...emptyErrors }

  if (!result.success) {
    const fieldErrors = result.error.flatten().fieldErrors
    nextErrors.member = fieldErrors.member?.[0] ?? ''
    nextErrors.dateRange = fieldErrors.dateRange?.[0] ?? ''
    nextErrors.totalAmount = fieldErrors.totalAmount?.[0] ?? ''
    nextErrors.cliff = fieldErrors.cliff?.[0] ?? ''
  }

  Object.assign(errors, nextErrors)
  return result.success
}

function checkDuplicateVesting() {
  if (
    member.value.address &&
    activeMembers.value.some((m) => m.toLowerCase() === member.value.address.toLowerCase())
  ) {
    toast.add({ title: 'The member address already has an active vesting.', color: 'error' })
    return true
  }
  return false
}

async function approveAllowance() {
  if (!checkDuplicateVesting()) {
    if (totalAmount.value > 0) {
      const totalAmountInUnits = parseUnits(totalAmount.value.toString(), VESTING_TOKEN_DECIMALS)
      approveToken({
        address: props.tokenAddress as Address,
        abi: INVESTOR_ABI,
        functionName: 'approve',
        args: [VESTING_ADDRESS as Address, totalAmountInUnits]
      })
    } else {
      toast.add({ title: 'total amount value should be greater than zero', color: 'error' })
    }
  }
}

function handleDisplaySummary() {
  if (validate()) showSummary.value = true
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
    toast.add({ title: 'Insufficient token balance', color: 'error' })
    return
  }

  await getAllowance()
  if (typeof allowance.value === 'bigint' && allowance.value < totalAmountInUnits) {
    toast.add({ title: 'Allowance is less than the total amount', color: 'error' })
    return
  }
  addVesting({
    address: VESTING_ADDRESS as Address,
    abi: VESTING_ABI,
    functionName: 'addVesting',
    args: [
      BigInt(teamStore.currentTeamId ?? 0),
      member.value.address as Address,
      BigInt(start),
      BigInt(durationInSeconds),
      BigInt(cliffInSeconds),
      totalAmountInUnits,
      props.tokenAddress as Address
    ]
  })
}
</script>
