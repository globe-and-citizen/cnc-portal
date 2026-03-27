<template>
  <div v-if="!showSummary" class="flex flex-col gap-5 max-w-5xl w-full">
    <h4 class="font-bold text-lg">Create Vesting Schedule</h4>
    <div class="gap-2 mt-4">
      <label class="flex-col items-center gap-2">
        <div class="flex w-32 mb-3">Choose Member</div>
        <div class="flex grow w-full">
          <SelectMemberInput
            v-model="member"
            data-test="member"
            class="text-xs w-full"
            :hidden-members="[]"
            :disable-team-members="false"
          />
        </div>
      </label>
      <span v-if="errors.member" class="text-xs text-red-500 mt-1">{{ errors.member }}</span>
    </div>

    <div class="gap-2 mt-4">
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

    <div class="flex flex-wrap gap-3 mt-4 w-100">
      <div class="flex-1 min-w-50">
        <label class="flex input input-bordered input-md items-center gap-2 w-full">
          <span class="text-xs shrink-0">Amount</span>
          <UInput
            data-test="total-amount"
            type="number"
            class="grow border-none shadow-none"
            :model-value="totalAmount"
            @update:model-value="(v) => (totalAmount = Number(v))"
            required
          />
        </label>
        <span v-if="errors.totalAmount" class="text-xs text-red-500 mt-1 block">
          {{ errors.totalAmount }}
        </span>
      </div>
      <div class="flex-1 min-w-50">
        <label class="flex input input-bordered items-center gap-2 w-full">
          <span class="text-xs shrink-0">Cliff(days)</span>
          <UInput
            data-test="cliff"
            type="number"
            class="grow text-sm border-none shadow-none"
            :model-value="cliff"
            @update:model-value="(v) => (cliff = Number(v))"
            required
          />
        </label>
        <span v-if="errors.cliff" class="text-xs text-red-500 mt-1 block">
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
import { parseEther, type Address, formatUnits, parseUnits } from 'viem'
import SelectMemberInput from '@/components/utils/SelectMemberInput.vue'
import VestingSummary from '@/components/sections/VestingView/VestingSummary.vue'
import { useToastStore } from '@/stores/useToastStore'
import { useTeamStore } from '@/stores'
import Datepicker from '@vuepic/vue-datepicker'
import '@vuepic/vue-datepicker/dist/main.css'
import { type VestingCreation } from '@/types/vesting'
import { useContractBalance } from '@/composables/useContractBalance'
import { INVESTOR_ABI } from '@/artifacts/abi/investors'
import { useUserDataStore } from '@/stores'
import { isAddress } from 'viem'
import { z } from 'zod'

const { addSuccessToast, addErrorToast } = useToastStore()

const props = defineProps<{
  tokenAddress: string
  reloadKey: number
}>()

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
    addErrorToast('Add admin failed')
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
    addErrorToast('error on get Allowance')
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
    addSuccessToast('vesting added successfully')
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
    addErrorToast('Add vesting failed')
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
    addSuccessToast('Approval added successfully')
    submit()
  }
})

watch(errorApproveToken, () => {
  if (errorApproveToken.value) {
    addErrorToast('Approval failed')
    console.error('Approval error ', errorApproveToken.value)
  }
})

function buildSchema() {
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
    totalAmount: z.number().refine((v) => v >= 1, { message: 'Amount must be greater than 0.' })
  })
}

function validate(): boolean {
  errors.member = ''
  errors.dateRange = ''
  errors.cliff = ''
  errors.totalAmount = ''

  const result = buildSchema().safeParse({
    member: member.value,
    dateRange: dateRange.value,
    cliff: cliff.value,
    totalAmount: totalAmount.value
  })

  if (!result.success) {
    for (const issue of result.error.issues) {
      const field = issue.path[0] as keyof typeof errors
      if (field in errors && !errors[field]) {
        errors[field] = issue.message
      }
    }
    return false
  }
  return true
}

function checkDuplicateVesting() {
  if (
    member.value.address &&
    activeMembers.value.some((m) => m.toLowerCase() === member.value.address.toLowerCase())
  ) {
    addErrorToast('The member address already has an active vesting.')
    return true
  }
  return false
}

async function approveAllowance() {
  if (!checkDuplicateVesting()) {
    if (totalAmount.value > 0) {
      approveToken({
        address: props.tokenAddress as Address,
        abi: INVESTOR_ABI,
        functionName: 'approve',
        args: [VESTING_ADDRESS as Address, parseEther(totalAmount.value.toString())]
      })
    } else {
      addErrorToast('total amount value should be greater than zero')
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

  if (tokenBalance.value !== undefined) {
    const totalAmountInUnits = parseUnits(totalAmount.value.toString(), 6)
    const balanceInUnits = parseUnits(tokenBalance.value.amount.toString(), 6)
    if (balanceInUnits < totalAmountInUnits) {
      addErrorToast('Insufficient token balance')
      return
    }
  }

  await getAllowance()
  if (
    typeof allowance.value === 'bigint' &&
    Number(formatUnits(allowance.value, 6)) < totalAmount.value
  ) {
    addErrorToast('Allowance is less than the total amount')
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
      parseUnits(totalAmount.value.toString(), 6),
      props.tokenAddress as Address
    ]
  })
}
</script>
