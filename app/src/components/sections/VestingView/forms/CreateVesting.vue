<template>
  <div class="flex flex-col gap-5">
    <h4 class="font-bold text-lg">Create Vesting Schedule</h4>
    <h3 class="pt-6">You’re about to create a vesting for a team member</h3>
    <label class="flex items-center gap-2">
      <span class="w-32">Member</span>
      <div class="flex flex-col grow">
        <SelectMemberInput
          v-model="memberInput"
          data-test="member"
          @selectMember="handleMemberSelect"
        />
        <span v-if="member && !isAddress(member)" class="text-xs text-red-500 mt-1">
          Please enter a valid Ethereum address.
        </span>
      </div>
    </label>

    <label class="flex items-center gap-2 mt-4">
      <span class="w-32">Period</span>
      <Datepicker
        v-model="dateRange"
        range
        multi-calendars
        auto-apply
        format="dd/MM/yyyy"
        placeholder="Select range"
        class="w-full"
      />
    </label>

    <div class="flex gap-3 mt-4 grow">
      <label class="inline-flex items-center gap-2 input-md mt-4 p-2">
        <span class="w-full text-xs">Years</span>
        <input
          type="number"
          min="0"
          v-model.number="duration.years"
          class="input input-bordered w-20"
        />
      </label>
      <label class="inline-flex items-center gap-2 input-md mt-4 p-2">
        <span class="w-full text-xs">Months</span>
        <input
          type="number"
          min="0"
          v-model.number="duration.months"
          class="input input-bordered w-20"
        />
      </label>
      <label class="inline-flex items-center gap-2 input-md mt-4 p-2">
        <span class="w-full text-xs">Days</span>
        <input
          type="number"
          min="0"
          v-model.number="duration.days"
          class="input input-bordered w-20"
        />
      </label>
    </div>

    <div class="flex gap-3 mt-4 grow">
      <label class="input input-bordered flex items-center gap-2 input-md mt-4">
        <span class="w-full text-xs">Amount</span>
        <input data-test="total-amount" type="number" class="grow" v-model="totalAmount" required />
      </label>
      <label class="input input-bordered flex items-center gap-2 input-md mt-4 min-w-0 p-1">
        <span class="w-full text-xs">Cliff(days)</span>
        <input data-test="cliff" type="number" v-model.number="cliff" required />
      </label>
    </div>

    <h3 class="pt-6 text-sm text-gray-600">
      By clicking "Create Vesting", you agree to lock this token amount under a vesting schedule.
      Ensure your contract is approved to transfer these tokens.
    </h3>

    <div class="modal-action justify-end">
      <ButtonUI
        variant="primary"
        size="sm"
        @click="approveAllowance"
        :disabled="loading || !formValid"
        :loading="loading"
        data-test="submit-btn"
      >
        Create Vesting
      </ButtonUI>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import {
  differenceInCalendarDays,
  differenceInMonths,
  differenceInYears,
  addYears,
  addMonths,
  addDays
} from 'date-fns'
import ButtonUI from '@/components/ButtonUI.vue'
import { useWaitForTransactionReceipt, useWriteContract, useReadContract } from '@wagmi/vue'
import VestingABI from '@/artifacts/abi/Vesting.json'
import { VESTING_ADDRESS } from '@/constant'
import { parseEther, type Address, formatUnits, parseUnits } from 'viem'
import SelectMemberInput from '@/components/utils/SelectMemberInput.vue'
import { useToastStore } from '@/stores/useToastStore'
import { useTeamStore } from '@/stores'
import Datepicker from '@vuepic/vue-datepicker'
import '@vuepic/vue-datepicker/dist/main.css'
const { addSuccessToast, addErrorToast } = useToastStore()

import { INVESTOR_ABI } from '@/artifacts/abi/investorsV1'
import { useUserDataStore } from '@/stores'
import { isAddress } from 'viem'

const props = defineProps<{
  tokenAddress: string
  reloadKey: number
}>()

const activeMembers = computed<string[]>(() => {
  if (vestingInfos.value && Array.isArray(vestingInfos.value) && vestingInfos.value.length === 2) {
    const [members] = vestingInfos.value
    return members
  }
  return []
})
const memberInput = ref({
  name: '',
  address: ''
})
const member = ref('')
const startDate = ref('')
//const duration = ref(30)
const cliff = ref(0)
const totalAmount = ref(0)
const dateRange = ref<[Date, Date] | null>(null)

const duration = ref({ years: 0, months: 0, days: 0 })
const durationInDays = ref(0)
const updateCount = ref(0)
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

watch(
  duration,
  async (val) => {
    const today = new Date()
    if (!dateRange.value || !dateRange.value[0]) {
      dateRange.value = [today, today]
    }
    if (updateCount.value > 2) return

    const start = dateRange.value[0]
    const { years, months, days } = val
    let newEnd = addYears(start, years)
    newEnd = addMonths(newEnd, months)
    newEnd = addDays(newEnd, days)
    dateRange.value = [start, newEnd]
    updateCount.value++
    if (updateCount.value === 2) await resetUpdateCount()
  },
  { deep: true }
)

const teamStore = useTeamStore()
const team = computed(() => teamStore.currentTeam)
const emit = defineEmits(['reload', 'closeAddVestingModal'])

const handleMemberSelect = (selected: { name: string; address: string }) => {
  memberInput.value = selected
  member.value = selected.address
}
const {
  data: vestingInfos,
  //isLoading: isLoadingVestingInfos,
  error: errorGetVestingInfo,
  refetch: getVestingInfos
} = useReadContract({
  functionName: 'getTeamVestingsWithMembers',
  address: VESTING_ADDRESS as Address,
  abi: VestingABI,
  args: [team?.value?.id ?? 0]
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
  //isLoading: isLoadingTokenSymbol
  error: allowanceError
} = useReadContract({
  abi: INVESTOR_ABI,
  address: props.tokenAddress as Address,
  functionName: 'allowance',
  args: [useUserDataStore().address as Address, VESTING_ADDRESS as Address]
})

watch(allowanceError, () => {
  if (allowanceError.value) {
    addErrorToast('error on get Allowance')
    console.error('allowance error ', allowanceError.value)
  }
})

const {
  writeContract: addVesting,
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
    member.value = ''
    startDate.value = ''
    cliff.value = 0
    totalAmount.value = 0
    dateRange.value = null
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
  writeContract: approveToken,
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

const {
  data: tokenBalance,
  // error: tokenBalanceError,
  //isLoading: isLoadingTokenBalance
  refetch: refetchTokenBalance
} = useReadContract({
  abi: INVESTOR_ABI,
  address: props.tokenAddress as Address,
  functionName: 'balanceOf',
  args: [useUserDataStore().address as Address]
})

const formValid = computed(() => {
  return (
    team.value?.id.valueOf !== null &&
    isAddress(member.value) &&
    durationInDays.value > 0 &&
    cliff.value >= 0 &&
    totalAmount.value > 0 &&
    cliff.value <= durationInDays.value
  )
})

function checkDuplicateVesting() {
  if (
    member.value &&
    activeMembers.value.some((m) => m.toLowerCase() === member.value.toLowerCase())
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
async function submit() {
  if (!formValid.value) return
  if (checkDuplicateVesting()) return
  const startDate = dateRange.value?.[0] || new Date()
  const start = Math.floor(startDate.getTime() / 1000)
  const durationInSeconds = durationInDays.value * 24 * 60 * 60
  const cliffInSeconds = cliff.value * 24 * 60 * 60

  await refetchTokenBalance()
  if (tokenBalance.value !== undefined) {
    const totalAmountInUnits = parseUnits(totalAmount.value.toString(), 6)
    if (tokenBalance.value < totalAmountInUnits) {
      addErrorToast('Insufficient token balance')
      return
    }
  }
  await getAllowance()
  if (
    allowance.value !== undefined &&
    Number(formatUnits(allowance.value, 6)) < totalAmount.value
  ) {
    addErrorToast('Allowance is less than the total amount')
    return
  }
  addVesting({
    address: VESTING_ADDRESS as Address,
    abi: VestingABI,
    functionName: 'addVesting',
    args: [
      team.value?.id,
      member.value as Address,
      start,
      durationInSeconds,
      cliffInSeconds,
      parseUnits(totalAmount.value.toString(), 6),
      props.tokenAddress as Address
    ]
  })
}
</script>
