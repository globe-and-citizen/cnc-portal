<template>
  <div class="flex flex-col gap-5">
    <h4 class="font-bold text-lg">Create Vesting Schedule</h4>
    <h3 class="pt-6">You’re about to create a vesting for a team member</h3>
    <label class="input input-bordered flex items-center gap-2 input-md mt-4">
      <span class="w-32">Member</span>
      <div class="flex flex-col grow">
        <input
          data-test="member"
          type="text"
          class="grow"
          v-model="member"
          placeholder="Member address"
          required
        />
        <span v-if="member && !isAddress(member)" class="text-xs text-red-500 mt-1">
          Please enter a valid Ethereum address.
        </span>
      </div>
    </label>

    <label class="input input-bordered flex items-center gap-2 input-md mt-4">
      <span class="w-32">Start Date</span>
      <input data-test="start-date" type="date" class="grow" v-model="startDate" required />
    </label>

    <div class="flex gap-3 mt-4 grow">
      <label
        class="input input-xs input-bordered flex items-center gap-4 input-md min-w-0 mt-4 p-1"
      >
        <span class="w-full text-xs">Duration(days)</span>
        <input data-test="duration" type="number" v-model.number="duration" required min="1" />
      </label>
      <label class="input input-bordered flex items-center gap-2 input-md mt-4 min-w-0 p-1">
        <span class="w-full text-xs">Cliff(days)</span>
        <input data-test="cliff" type="number" v-model.number="cliff" required />
      </label>
    </div>

    <div class="flex gap-3 mt-4 grow">
      <label class="input input-bordered flex items-center gap-2 input-md mt-4">
        <span class="w-full text-xs">Amount</span>
        <input data-test="total-amount" type="number" class="grow" v-model="totalAmount" required />
      </label>
      <span class="flex items-center gap-2 input-md mt-4 min-w-0 p-1">
        <ButtonUI
          variant="primary"
          size="sm"
          @click="approveAllowance"
          :disabled="totalAmount <= 0 || tokenApproved || loadingAllowance"
          :loading="loadingAllowance"
          data-test="approve-btn"
        >
          approve Allowance
        </ButtonUI>
      </span>
    </div>

    <h3 class="pt-6 text-sm text-gray-600">
      By clicking "Create Vesting", you agree to lock this token amount under a vesting schedule.
      Ensure your contract is approved to transfer these tokens.
    </h3>

    <div class="modal-action justify-end">
      <ButtonUI
        variant="primary"
        size="sm"
        @click="submit"
        :disabled="loading || !formValid || !tokenApproved"
        :loading="loading"
        data-test="submit-btn"
      >
        Create Vesting
      </ButtonUI>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import ButtonUI from '@/components/ButtonUI.vue'
import { useWaitForTransactionReceipt, useWriteContract, useReadContract } from '@wagmi/vue'
import VestingABI from '@/artifacts/abi/Vesting.json'
import { VESTING_ADDRESS } from '@/constant'
import { parseEther, formatEther, type Address, formatUnits, parseUnits } from 'viem'
import { useToastStore } from '@/stores/useToastStore'
import { type VestingRow } from '@/types/vesting'
const { addSuccessToast, addErrorToast } = useToastStore()
import { INVESTOR_ABI } from '@/artifacts/abi/investorsV1'
import { useUserDataStore } from '@/stores'
import { isAddress } from 'viem'

const props = defineProps<{
  teamId: number
  tokenAddress: string
  vestings: VestingRow[]
}>()

const member = ref('')
const startDate = ref('')
const duration = ref(30)
const cliff = ref(0)
const totalAmount = ref(0)
const tokenApproved = ref(false)

const emit = defineEmits(['reloadVestingInfos', 'closeAddVestingModal'])

const loading = computed(
  () => loadingAddVesting.value || (isConfirmingAddVesting.value && !isConfirmedAddVesting.value)
)

const loadingAllowance = computed(
  () =>
    loadingApproveToken.value || (isConfirmingApproveToken.value && !isConfirmedApproveToken.value)
)

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
    duration.value = 30
    cliff.value = 0
    totalAmount.value = 0
    tokenApproved.value = false
    emit('closeAddVestingModal')
    emit('reloadVestingInfos')
  }
})

watch(errorAddVesting, () => {
  if (errorAddVesting.value) {
    addErrorToast('Add vesting failed')
    console.error('add vesting error', errorAddVesting.value)
  }
})

defineExpose({
  tokenApproved
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
  tokenApproved.value = false
  if (wasConfirming && !isConfirming && isConfirmedApproveToken.value) {
    addSuccessToast('Approval added successfully')
    tokenApproved.value = true
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
    props.teamId.valueOf !== null &&
    isAddress(member.value) &&
    startDate.value &&
    duration.value > 0 &&
    cliff.value >= 0 &&
    totalAmount.value > 0 &&
    cliff.value <= duration.value
  )
})

function checkDuplicateVesting() {
  if (
    member.value &&
    props.vestings.some((v) => v.member.toLowerCase() === member.value.toLowerCase())
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

  const start = Math.floor(new Date(startDate.value).getTime() / 1000)
  const durationInSeconds = duration.value * 24 * 60 * 60
  const cliffInSeconds = cliff.value * 24 * 60 * 60
  await refetchTokenBalance()
  console.log('the token balance ===== ', tokenBalance.value)
  if (tokenBalance.value !== undefined) {
    const tokenBalanceFormatted = formatUnits(tokenBalance.value, 6)
    const totalAmountInUnits = parseUnits(totalAmount.value.toString(), 6)

    console.log('Token Balance:', tokenBalanceFormatted)
    console.log('Total Amount:', totalAmount.value)

    if (tokenBalance.value < totalAmountInUnits) {
      addErrorToast('Insufficient token balance')
      return
    }
  }
  await getAllowance()
  if (allowance.value !== undefined && Number(formatEther(allowance.value)) < totalAmount.value) {
    addErrorToast('Allowance is less than the total amount')

    return
  }

  addVesting({
    address: VESTING_ADDRESS as Address,
    abi: VestingABI,
    functionName: 'addVesting',
    args: [
      props.teamId,
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
