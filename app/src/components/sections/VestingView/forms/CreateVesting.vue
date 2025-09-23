<template>
  <div v-if="!showSummary" class="flex flex-col gap-5 max-w-5xl w-full">
    <h4 class="font-bold text-lg">Create Vesting Schedule</h4>
    <div class="gap-2 mt-4">
      <label class="flex-col items-center gap-2">
        <div class="flex w-32 mb-3">Choose Member</div>
        <div class="flex grow w-full">
          <SelectMemberInput v-model="member" data-test="member" class="text-xs w-full" />
        </div>
      </label>
      <span v-for="error in $v.member.$errors" :key="error.$uid" class="text-xs text-red-500 mt-1">
        {{ error.$message }}
      </span>
    </div>

    <div class="gap-2 mt-4">
      <label class="flex items-center">
        <span class="w-32 flex-shrink-0">Period</span>
        <div class="flex-grow">
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
      <span v-for="error in $v.dateRange.$errors" :key="error.$uid" class="text-xs text-red-500">
        {{ error.$message }}
      </span>
    </div>

    <div class="flex flex-wrap gap-3 mt-4 w-100">
      <div class="flex-1 min-w-[200px]">
        <label class="flex input input-bordered input-md items-center gap-2 w-full">
          <span class="text-xs flex-shrink-0">Amount</span>
          <input
            data-test="total-amount"
            type="number"
            class="grow"
            v-model="totalAmount"
            required
          />
        </label>
        <span
          v-for="error in $v.totalAmount.$errors"
          :key="error.$uid"
          class="text-xs text-red-500 mt-1 block"
        >
          {{ error.$message }}
        </span>
      </div>
      <div class="flex-1 min-w-[200px]">
        <label class="flex input input-bordered items-center gap-2 w-full">
          <span class="text-xs flex-shrink-0">Cliff(days)</span>
          <input data-test="cliff" type="number" class="grow text-sm" v-model="cliff" required />
        </label>
        <span
          v-for="error in $v.cliff.$errors"
          :key="error.$uid"
          class="text-xs text-red-500 mt-1 block"
        >
          {{ error.$message }}
        </span>
      </div>
    </div>

    <h3 class="pt-6 text-sm text-gray-600">
      By clicking "Create Vesting", you agree to lock this token amount under a vesting schedule.
      Ensure your contract is approved to transfer these tokens.
    </h3>
    <div class="modal-action justify-end">
      <ButtonUI
        variant="primary"
        size="sm"
        @click="handleDisplaySummary"
        :disabled="loading"
        :loading="loading"
        data-test="submit-btn"
      >
        Create Vesting
      </ButtonUI>
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
import { computed, nextTick, ref, watch } from 'vue'
import { differenceInCalendarDays, differenceInMonths, differenceInYears } from '@/utils/dayUtils'
import ButtonUI from '@/components/ButtonUI.vue'
import { useWaitForTransactionReceipt, useWriteContract, useReadContract } from '@wagmi/vue'
import VestingABI from '@/artifacts/abi/Vesting.json'
import { VESTING_ADDRESS } from '@/constant'
import { parseEther, type Address, formatUnits, parseUnits } from 'viem'
import SelectMemberInput from '@/components/utils/SelectMemberInput.vue'
import VestingSummary from '@/components/sections/VestingView/VestingSummary.vue'
import { useToastStore } from '@/stores/useToastStore'
import { useTeamStore } from '@/stores'
import Datepicker from '@vuepic/vue-datepicker'
import '@vuepic/vue-datepicker/dist/main.css'
import { type VestingCreation } from '@/types/vesting'
const { addSuccessToast, addErrorToast } = useToastStore()
import { useContractBalance } from '@/composables/useContractBalance'
import { INVESTOR_ABI } from '@/artifacts/abi/investorsV1'
import { useUserDataStore } from '@/stores'
import { isAddress } from 'viem'
import { required, helpers, minValue } from '@vuelidate/validators'
import { useVuelidate } from '@vuelidate/core'

const props = defineProps<{
  tokenAddress: string
  reloadKey: number
}>()

// function reset() {
//   member.value = { name: '', address: '' }
//   startDate.value = ''
//   cliff.value = 0
//   totalAmount.value = 0
//   dateRange.value = null
//   duration.value = { years: 0, months: 0, days: 0 }
//   showSummary.value = false
// }
// defineExpose({ reset })

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
  // Find the balance entry for the current token address
  return balances.value.find(
    (b) => b.token.address?.toLowerCase() === props.tokenAddress.toLowerCase()
  )
})

const activeMembers = computed<string[]>(() => {
  if (vestingInfos.value && Array.isArray(vestingInfos.value) && vestingInfos.value.length === 2) {
    const [members] = vestingInfos.value
    return members
  }
  return []
})
const member = ref({
  name: '',
  address: ''
})

const startDate = ref('')
//const duration = ref(30)
const cliff = ref(0)
const totalAmount = ref(0)
const dateRange = ref<[Date, Date] | null>(null)

const duration = ref({ years: 0, months: 0, days: 0 })
const durationInDays = ref(0)
const updateCount = ref(0)
const showSummary = ref(false)

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
  //isLoading: isLoadingVestingInfos,
  error: errorGetVestingInfo,
  refetch: getVestingInfos
} = useReadContract({
  functionName: 'getTeamVestingsWithMembers',
  address: VESTING_ADDRESS as Address,
  abi: VestingABI,
  args: [teamStore.currentTeam?.id ?? 0]
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
  args: [userDataStore.address as Address, VESTING_ADDRESS as Address]
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

const validAddress = helpers.withMessage('Please enter a valid Ethereum address.', () => {
  return isAddress(member.value.address)
})

const rules = {
  member: {
    address: {
      required: helpers.withMessage('Member is required. ', required),
      validAddress
    }
  },
  dateRange: {
    required: helpers.withMessage('Date range is required.', required)
  },
  cliff: {
    required: helpers.withMessage('Cliff is required.', required),
    minValue: minValue(0),
    notGreaterThanDuration: helpers.withMessage(
      'Cliff cannot be greater than duration.',
      (value: number) => value <= durationInDays.value
    )
  },
  totalAmount: {
    required: helpers.withMessage('Amount is required.', required),
    minValue: helpers.withMessage('Amount must be greater than 0.', minValue(1))
  }
}

const $v = useVuelidate(rules, {
  member,
  dateRange,
  cliff,
  totalAmount
})

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
  $v.value.$touch()
  if (!$v.value.$invalid) showSummary.value = true
}
async function submit() {
  $v.value.$touch()
  if ($v.value.$invalid) return
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
      teamStore.currentTeam?.id,
      member.value.address as Address,
      start,
      durationInSeconds,
      cliffInSeconds,
      parseUnits(totalAmount.value.toString(), 6),
      props.tokenAddress as Address
    ]
  })
}
</script>
