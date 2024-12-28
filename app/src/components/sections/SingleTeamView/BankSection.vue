<template>
  <div class="flex flex-col gap-y-4 py-6 lg:px-4 sm:px-6">
    <span class="text-2xl sm:text-3xl font-bold">Team Bank Account</span>
    <div class="divider m-0"></div>
    <div class="space-y-4">
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div class="space-y-2">
          <div>
            <span>Bank Balance</span>
            <div class="font-extrabold text-4xl">
              <span class="inline-block min-w-16 h-10">
                <span class="loading loading-spinner loading-lg" v-if="balanceLoading"></span>
                <span v-else>{{ teamBalance?.formatted }} </span>
              </span>
              <span class="text-xs">{{ NETWORK.currencySymbol }}</span>
            </div>
            <span class="text-xs sm:text-sm">≈ $ 1.28</span>
          </div>
          <div>
            <span>Token Balance</span>
            <div class="text-lg">
              <div>USDC: {{ usdcBalance ? Number(usdcBalance) / 1e6 : '0' }}</div>
            </div>
          </div>
        </div>
        <div class="grid grid-cols-3 gap-2">
          <Button
            v-if="team.bankAddress"
            @click="() => (depositModal = true)"
            data-test="deposit-button"
            class="btn btn-sm btn-secondary"
          >
            Deposit
          </Button>
          <Button
            v-if="team.bankAddress"
            @click="() => (pushTipModal = true)"
            class="btn btn-sm btn-secondary"
          >
            Tip the Team
          </Button>
          <Button
            v-if="team.bankAddress && (team.ownerAddress == currentAddress || isBod)"
            @click="transferModal = true"
            class="btn btn-sm btn-secondary"
          >
            Transfer
          </Button>
          <Button
            v-if="team.bankAddress"
            @click="() => (tokenDepositModal = true)"
            class="btn btn-sm btn-secondary"
          >
            Deposit USDC
          </Button>
          <Button
            v-if="team.bankAddress && (team.ownerAddress == currentAddress || isBod)"
            @click="tokenTransferModal = true"
            class="btn btn-sm btn-secondary"
          >
            Transfer USDC
          </Button>
          <Button
            v-if="team.bankAddress"
            @click="() => (tokenTipModal = true)"
            class="btn btn-sm btn-secondary"
          >
            Tip USDC
          </Button>
        </div>
      </div>
      <div
        class="flex flex-col sm:flex-row gap-2 sm:gap-4 justify-start sm:justify-end items-start sm:items-center"
        data-test="team-bank-address"
      >
        <span class="text-sm">Bank Address </span>
        <AddressToolTip :address="team.bankAddress ?? ''" class="text-xs" />
      </div>
    </div>

    <ModalComponent v-model="depositModal">
      <DepositBankForm
        v-if="depositModal"
        @close-modal="() => (depositModal = false)"
        @deposit="async (amount: string) => depositToBank(amount)"
        :loading="depositLoading || isConfirmingDeposit"
      />
    </ModalComponent>
    <ModalComponent v-model="transferModal">
      <TransferFromBankForm
        v-if="transferModal"
        @close-modal="() => (transferModal = false)"
        @transfer="
          async (to: string, amount: string, description: string) => {
            if (owner == team.boardOfDirectorsAddress) {
              await addTransferAction(to, amount, description)
            } else {
              await transferFromBank(to, amount)
            }
          }
        "
        @searchMembers="(input: string) => searchUsers({ name: '', address: input })"
        :filteredMembers="foundUsers"
        :loading="transferLoading || addActionLoading || isConfirmingTransfer"
        :bank-balance="teamBalance?.formatted || '0'"
        service="Bank"
        :asBod="owner == team.boardOfDirectorsAddress"
      />
    </ModalComponent>
    <ModalComponent v-model="pushTipModal">
      <div class="flex flex-col gap-4 justify-start">
        <span class="font-bold text-xl sm:text-2xl">Tip The Team</span>
        <span class="text-sm sm:text-base">
          Sends a tip to all team Members {{ tipAmount }} {{ NETWORK.currencySymbol }}
        </span>

        <input
          type="text"
          size="5"
          class="input input-bordered w-full"
          placeholder="Tip"
          v-model="tipAmount"
        />

        <div class="text-center">
          <LoadingButton
            v-if="isConfirmingPushTip || pushTipLoading || addActionLoading"
            class="w-full sm:w-44"
            color="primary"
          />
          <button
            v-if="!(isConfirmingPushTip || pushTipLoading || addActionLoading)"
            class="btn btn-primary w-full sm:w-44 text-center"
            @click="
              async () => {
                if (owner == team.boardOfDirectorsAddress) {
                  addPushTipAction('Pushed tips to all team members')
                } else {
                  const members = team.members.map((member: TeamMember) => member.address)
                  pushTip({
                    address: team.bankAddress as Address,
                    abi: BankABI,
                    functionName: 'pushTip',
                    args: [members, parseEther(tipAmount.toString())],
                    value: parseEther(tipAmount.toString())
                  })
                }
              }
            "
          >
            Send Tips
          </button>
        </div>
      </div>
    </ModalComponent>
    <ModalComponent v-model="tokenTipModal">
      <div class="flex flex-col gap-4 justify-start">
        <span class="font-bold text-xl sm:text-2xl">Tip USDC</span>
        <div class="form-control w-full">
          <label class="label">
            <span class="label-text">Amount</span>
          </label>
          <input
            type="number"
            class="input input-bordered w-full"
            placeholder="Enter amount"
            v-model="tokenAmountUSDC"
          />
        </div>
        <div class="text-center">
          <LoadingButton
            v-if="
              isConfirmingPushTokenTip ||
              pushTokenTipLoading ||
              isConfirmingPushTokenTip ||
              isPendingApprove ||
              isConfirmingApprove
            "
            class="w-full sm:w-44"
            color="primary"
          />
          <button
            class="btn btn-primary w-full sm:w-44 text-center"
            @click="pushUSDC"
            data-test="tip-usdc-button"
            v-else
          >
            Tip USDC to Team
          </button>
        </div>
      </div>
    </ModalComponent>

    <ModalComponent v-model="tokenDepositModal">
      <div class="flex flex-col gap-4 justify-start">
        <span class="font-bold text-xl sm:text-2xl">Deposit USDC</span>
        <div class="form-control w-full">
          <label class="label">
            <span class="label-text">Amount</span>
          </label>
          <input
            type="number"
            class="input input-bordered w-full"
            placeholder="Enter amount"
            v-model="tokenAmount"
          />
        </div>
        <div class="text-center">
          <LoadingButton
            v-if="
              isConfirmingTokenDeposit ||
              tokenDepositLoading ||
              isConfirmingTokenDeposit ||
              isConfirmingApprove ||
              isPendingApprove
            "
            class="w-full sm:w-44"
            color="primary"
          />
          <button v-else class="btn btn-primary w-full sm:w-44 text-center" @click="depositToken">
            Deposit USDC
          </button>
        </div>
      </div>
    </ModalComponent>

    <ModalComponent v-model="tokenTransferModal">
      <div class="flex flex-col gap-4 justify-start">
        <span class="font-bold text-xl sm:text-2xl">Transfer USDC</span>
        <div class="form-control w-full">
          <label class="label">
            <span class="label-text">To Address</span>
          </label>
          <input
            type="text"
            class="input input-bordered w-full"
            placeholder="Enter recipient address"
            v-model="tokenRecipient"
          />
        </div>
        <div class="form-control w-full">
          <label class="label">
            <span class="label-text">Amount</span>
          </label>
          <input
            type="number"
            class="input input-bordered w-full"
            placeholder="Enter amount"
            v-model="tokenAmount"
          />
        </div>
        <div class="text-center">
          <LoadingButton
            v-if="
              isConfirmingTokenTransfer ||
              tokenTransferLoading ||
              isConfirmingTokenTransfer ||
              isPendingApprove ||
              isConfirmingApprove
            "
            class="w-full sm:w-44"
            color="primary"
          />
          <button
            v-else
            class="btn btn-primary w-full sm:w-44 text-center"
            @click="transferToken"
            data-test="transfer-usdc-button"
          >
            Transfer USDC
          </button>
        </div>
      </div>
    </ModalComponent>
  </div>
  <InvoiceSection :team="team" />
  <!-- <BankManagement :isBod="isBod" :team="team" :bankOwner="owner" :loadingOwner="loadingOwner" /> -->
</template>
<script setup lang="ts">
import type { Team, User } from '@/types'
import { NETWORK } from '@/constant'
import { onMounted, ref, watch, computed } from 'vue'
import LoadingButton from '@/components/LoadingButton.vue'
import { useUserDataStore } from '@/stores/user'
import ModalComponent from '@/components/ModalComponent.vue'
import DepositBankForm from '@/components/forms/DepositBankForm.vue'
import Button from '@/components/ButtonUI.vue'
import { useSendTransaction, useWaitForTransactionReceipt, useWriteContract } from '@wagmi/vue'
import { useToastStore } from '@/stores/useToastStore'
import TransferFromBankForm from '@/components/forms/TransferFromBankForm.vue'
import { useBalance, useReadContract } from '@wagmi/vue'
import { useCustomFetch } from '@/composables/useCustomFetch'
import { useAddAction } from '@/composables/bod'
import { encodeFunctionData, parseEther, type Address } from 'viem'
import { USDC_ADDRESS } from '@/constant'
import AddressToolTip from '@/components/AddressToolTip.vue'
// import BankManagement from './BankManagement.vue'
import BankABI from '@/artifacts/abi/bank.json'
import BoDABI from '@/artifacts/abi/bod.json'
import ERC20ABI from '@/artifacts/abi/erc20.json'
import { readContract } from '@wagmi/core'
import { config } from '@/wagmi.config'
import InvoiceSection from './InvoiceSection.vue'

const tipAmount = ref(0)
const transferModal = ref(false)
const pushTipModal = ref(false)
const foundUsers = ref<User[]>([])
const searchUserName = ref('')
const searchUserAddress = ref('')

const { addSuccessToast, addErrorToast } = useToastStore()

const depositModal = ref(false)
const props = defineProps<{
  team: Pick<Team, 'bankAddress' | 'boardOfDirectorsAddress' | 'ownerAddress' | 'members'>
}>()
const {
  sendTransaction,
  isPending: depositLoading,
  error: sendTransactionError,
  data: depositHash
} = useSendTransaction()

const currentAddress = useUserDataStore().address
const { isLoading: isConfirmingDeposit } = useWaitForTransactionReceipt({
  hash: depositHash
})

const {
  data: teamBalance,
  isLoading: balanceLoading,
  error: balanceError,
  refetch: fetchBalance
} = useBalance({
  address: props.team.bankAddress as `${Address}`
})
const {
  data: pushTokenTipHash,
  writeContract: pushTokenTip,
  isPending: pushTokenTipLoading,
  error: pushTokenTipError
} = useWriteContract()
const { isLoading: isConfirmingPushTokenTip } = useWaitForTransactionReceipt({
  hash: pushTokenTipHash
})

watch(isConfirmingPushTokenTip, (newIsConfirming, oldIsConfirming) => {
  if (!newIsConfirming && oldIsConfirming) {
    addSuccessToast('Tips pushed successfully')
    tokenTipModal.value = false
  }
})

watch(pushTokenTipError, () => {
  if (pushTokenTipError.value) {
    console.error(pushTokenTipError.value)
  }
})

const {
  data: pushTipHash,
  writeContract: pushTip,
  isPending: pushTipLoading,
  error: pushTipError
} = useWriteContract()
const { isLoading: isConfirmingPushTip, isSuccess: isConfirmedPushTip } =
  useWaitForTransactionReceipt({
    hash: pushTipHash
  })

watch(isConfirmingPushTip, (isConfirming, wasConfirming) => {
  if (wasConfirming && !isConfirming && isConfirmedPushTip.value) {
    addSuccessToast('Tips pushed successfully')
    pushTipModal.value = false
  }
})
const { data: boardOfDirectors, refetch: executeGetBoardOfDirectors } = useReadContract({
  functionName: 'getBoardOfDirectors',
  address: props.team.boardOfDirectorsAddress as Address,
  abi: BoDABI
})
const isBod = computed(() =>
  (boardOfDirectors.value as Array<Address>)?.includes(currentAddress as Address)
)

const {
  execute: executeAddAction,
  error: errorAddAction,
  isLoading: addActionLoading,
  isSuccess: addActionSuccess
} = useAddAction()
const {
  execute: executeSearchUser,
  response: searchUserResponse,
  data: users
} = useCustomFetch('user/search', {
  immediate: false,
  beforeFetch: async ({ options, url, cancel }) => {
    const params = new URLSearchParams()
    if (!searchUserName.value && !searchUserAddress.value) return
    if (searchUserName.value) params.append('name', searchUserName.value)
    if (searchUserAddress.value) params.append('address', searchUserAddress.value)
    url += '?' + params.toString()
    return { options, url, cancel }
  }
})
  .get()
  .json()

const {
  data: owner,
  error: errorOwner,
  // isLoading: loadingOwner,
  refetch: getOwner
} = useReadContract({
  functionName: 'owner',
  address: props.team.bankAddress! as Address,
  abi: BankABI
})

const addTransferAction = async (to: string, amount: string, description: string) => {
  await executeAddAction(props.team, {
    targetAddress: props.team.bankAddress! as Address,
    data: encodeFunctionData({
      abi: BankABI,
      functionName: 'transfer',
      args: [to, parseEther(amount)]
    }) as Address,
    description
  })
}
const addPushTipAction = async (description: string) => {
  await executeAddAction(props.team, {
    targetAddress: props.team.bankAddress! as Address,
    data: encodeFunctionData({
      abi: BankABI,
      functionName: 'pushTip',
      args: [membersAddress.value, parseEther(tipAmount.value.toString())]
    }) as Address,
    description
  })
}
watch(isConfirmingDeposit, (newIsConfirming, oldIsConfirming) => {
  if (!newIsConfirming && oldIsConfirming) {
    addSuccessToast('Deposited successfully')
    depositModal.value = false
    fetchBalance()
  }
})
watch(sendTransactionError, () => {
  if (sendTransactionError.value) {
    addErrorToast('Failed to deposit')
  }
})
watch(balanceLoading, () => {
  if (balanceLoading.value) {
    addErrorToast('Failed to fetch team balance')
  }
})
watch(balanceError, () => {
  if (balanceError.value) {
    addErrorToast('Failed to fetch team balance')
  }
})
watch(pushTipError, async () => {
  if (pushTipError.value) {
    addErrorToast('Failed to push tip')
  }
})

watch(searchUserResponse, () => {
  if (searchUserResponse.value?.ok && users.value?.users) {
    foundUsers.value = users.value.users
  }
})
watch(errorOwner, () => {
  if (errorOwner.value) {
    addErrorToast('Failed to get bank owner')
  }
})
watch(errorAddAction, () => {
  if (errorAddAction.value) {
    addErrorToast('Failed to add action')
  }
})
watch(addActionSuccess, () => {
  if (addActionSuccess.value) {
    addSuccessToast('Action added successfully')
    transferModal.value = false
    pushTipModal.value = false
    tipAmount.value = 0
  }
})

const depositToBank = async (amount: string) => {
  if (props.team.bankAddress) {
    sendTransaction({
      to: props.team.bankAddress as Address,
      value: parseEther(amount)
    })
  }
}

const {
  data: transferHash,
  isPending: transferLoading,
  error: transferError,
  writeContract: transfer
} = useWriteContract()
const transferFromBank = async (to: string, amount: string) => {
  if (!props.team.bankAddress) return
  transfer({
    address: props.team.bankAddress as Address,
    abi: BankABI,
    functionName: 'transfer',
    args: [to, parseEther(amount)]
  })
}

const { isLoading: isConfirmingTransfer } = useWaitForTransactionReceipt({
  hash: transferHash
})

const searchUsers = async (input: { name: string; address: string }) => {
  try {
    searchUserName.value = input.name
    searchUserAddress.value = input.address
    if (searchUserName.value || searchUserAddress.value) {
      await executeSearchUser()
    }
  } catch (error) {
    addErrorToast('Failed to search users')
  }
}

watch(transferError, () => {
  if (transferError.value) {
    addErrorToast('Failed to transfer from bank')
  }
})

watch(isConfirmingTransfer, (newIsConfirming, oldIsConfirming) => {
  if (!newIsConfirming && oldIsConfirming) {
    addSuccessToast('Transferred successfully')
    transferModal.value = false
    fetchBalance()
  }
})

const tokenDepositModal = ref(false)
const tokenTransferModal = ref(false)
const tokenTipModal = ref(false)
const tokenAmount = ref('')
const tokenAmountUSDC = ref('')
const tokenRecipient = ref('')

const {
  writeContract: writeTokenDeposit,
  isPending: tokenDepositLoading,
  data: tokenDepositHash,
  error: tokenDepositError
} = useWriteContract()

const { isLoading: isConfirmingTokenDeposit } = useWaitForTransactionReceipt({
  hash: tokenDepositHash
})

const {
  writeContract: writeTokenTransfer,
  isPending: tokenTransferLoading,
  data: tokenTransferHash,
  error: tokenTransferError
} = useWriteContract()

const { isLoading: isConfirmingTokenTransfer } = useWaitForTransactionReceipt({
  hash: tokenTransferHash
})
const {
  writeContract: approve,
  error: approveError,
  data: approveHash,
  isPending: isPendingApprove
} = useWriteContract()
const { isLoading: isConfirmingApprove } = useWaitForTransactionReceipt({
  hash: approveHash
})
const currentAction = ref('')
watch(isConfirmingApprove, (newIsConfirming, oldIsConfirming) => {
  if (!newIsConfirming && oldIsConfirming) {
    addSuccessToast('Approval granted successfully')
    if (currentAction.value === 'depositToken') {
      depositToken()
    } else if (currentAction.value === 'transferToken') {
      transferToken()
    } else if (currentAction.value === 'pushTokenTip') {
      pushUSDC()
    }
  }
})
watch(approveError, () => {
  if (approveError.value) {
    addErrorToast('Failed to approve token spending')
  }
})

const pushUSDC = async () => {
  currentAction.value = 'pushTokenTip'
  if (!props.team.bankAddress || !tokenAmountUSDC.value) return
  const amount = BigInt(Number(tokenAmountUSDC.value) * 1e6)

  try {
    const allowance = await readContract(config, {
      address: USDC_ADDRESS as Address,
      abi: ERC20ABI,
      functionName: 'allowance',
      args: [currentAddress as Address, props.team.bankAddress as Address]
    })
    console.log('allowance', allowance)
    const currentAllowance = allowance ? allowance.toString() : 0n
    if (Number(currentAllowance) < Number(amount)) {
      approve({
        address: USDC_ADDRESS as Address,
        abi: ERC20ABI,
        functionName: 'approve',
        args: [props.team.bankAddress as Address, amount]
      })
    }
    pushTokenTip({
      address: props.team.bankAddress as Address,
      abi: BankABI,
      functionName: 'pushTokenTip',
      args: [membersAddress.value, USDC_ADDRESS, amount]
    })
  } catch (error) {
    console.error(error)
  }
}

const depositToken = async () => {
  currentAction.value = 'depositToken'
  if (!props.team.bankAddress || !tokenAmount.value) return
  const amount = BigInt(Number(tokenAmount.value) * 1e6)

  try {
    const allowance = await readContract(config, {
      address: USDC_ADDRESS as Address,
      abi: ERC20ABI,
      functionName: 'allowance',
      args: [currentAddress as Address, props.team.bankAddress as Address]
    })
    const currentAllowance = allowance ? allowance.toString() : 0n
    if (Number(currentAllowance) < Number(amount)) {
      approve({
        address: USDC_ADDRESS as Address,
        abi: ERC20ABI,
        functionName: 'approve',
        args: [props.team.bankAddress as Address, amount]
      })
    }
    writeTokenDeposit({
      address: props.team.bankAddress as Address,
      abi: BankABI,
      functionName: 'depositToken',
      args: [USDC_ADDRESS as Address, amount]
    })
  } catch (error) {
    console.error(error)
  }
}

const transferToken = async () => {
  currentAction.value = 'transferToken'
  if (!props.team.bankAddress || !tokenAmount.value || !tokenRecipient.value) return
  const amount = BigInt(Number(tokenAmount.value) * 1e6) // USDC has 6 decimals

  try {
    // Check current allowance
    const allowance = await readContract(config, {
      address: USDC_ADDRESS as Address,
      abi: ERC20ABI,
      functionName: 'allowance',
      args: [currentAddress as Address, props.team.bankAddress as Address]
    })
    console.log('allowance', allowance)
    const currentAllowance = allowance ? allowance.toString() : 0n
    if (Number(currentAllowance) < Number(amount)) {
      approve({
        address: USDC_ADDRESS as Address,
        abi: ERC20ABI,
        functionName: 'approve',
        args: [props.team.bankAddress as Address, amount]
      })
    } else {
      writeTokenTransfer({
        address: props.team.bankAddress as Address,
        abi: BankABI,
        functionName: 'transferToken',
        args: [USDC_ADDRESS, tokenRecipient.value as Address, amount]
      })
    }
  } catch (error) {
    console.error(error)
  }
}
watch(tokenDepositError, () => {
  if (tokenDepositError.value) {
    console.log(tokenDepositError.value)
  }
})
watch(tokenTransferError, () => {
  if (tokenTransferError.value) {
    console.log(tokenTransferError.value)
  }
})
watch(isConfirmingTokenDeposit, (newIsConfirming, oldIsConfirming) => {
  if (!newIsConfirming && oldIsConfirming) {
    addSuccessToast('Token deposited successfully')
    fetchUsdcBalance()
    tokenDepositModal.value = false
    tokenAmount.value = ''
  }
})

watch(isConfirmingTokenTransfer, (newIsConfirming, oldIsConfirming) => {
  if (!newIsConfirming && oldIsConfirming) {
    addSuccessToast('Token transferred successfully')
    fetchUsdcBalance()
    tokenTransferModal.value = false
    tokenAmount.value = ''
    tokenRecipient.value = ''
  }
})

const {
  data: usdcBalance,
  refetch: fetchUsdcBalance,
  error: usdcBalanceError
} = useReadContract({
  address: USDC_ADDRESS as Address,
  abi: ERC20ABI,
  functionName: 'balanceOf',
  args: [props.team.bankAddress as Address]
})
watch(usdcBalance, () => {
  if (usdcBalance.value) {
    console.log(usdcBalance.value)
  }
})
watch(usdcBalanceError, () => {
  if (usdcBalanceError.value) {
    addErrorToast('Failed to fetch USDC balance')
  }
})

onMounted(async () => {
  if (props.team.bankAddress) {
    fetchBalance()
    fetchUsdcBalance()
  }
  await getOwner()
  await executeGetBoardOfDirectors()
})
const membersAddress = computed(() => {
  return props.team.members?.map((member: { address: string }) => member.address) ?? []
})

interface TeamMember {
  address: string
}
</script>
