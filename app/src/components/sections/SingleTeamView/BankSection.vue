<template>
  <div class="flex flex-col gap-y-4 py-6 lg:px-4 sm:px-6">
    <span class="text-2xl sm:text-3xl font-bold">Team Bank Account</span>
    <div class="divider m-0"></div>
    <div class="space-y-4">
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
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
        <div class="grid grid-cols-3 gap-2">
          <Button
            v-if="team.bankAddress"
            @click="() => (depositModal = true)"
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
            Deposit Token
          </Button>
          <Button
            v-if="team.bankAddress && (team.ownerAddress == currentAddress || isBod)"
            @click="tokenTransferModal = true"
            class="btn btn-sm btn-secondary"
          >
            Transfer Token
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

    <ModalComponent v-model="tokenDepositModal">
      <div class="flex flex-col gap-4 justify-start">
        <span class="font-bold text-xl sm:text-2xl">Deposit Token</span>
        <div class="form-control w-full">
          <label class="label">
            <span class="label-text">Select Token</span>
          </label>
          <select class="select select-bordered" v-model="selectedToken">
            <option value="USDT">USDT</option>
            <option value="USDC">USDC</option>
          </select>
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
            v-if="isConfirmingTokenDeposit || tokenDepositLoading"
            class="w-full sm:w-44"
            color="primary"
          />
          <button v-else class="btn btn-primary w-full sm:w-44 text-center" @click="depositToken">
            Deposit Token
          </button>
        </div>
      </div>
    </ModalComponent>

    <ModalComponent v-model="tokenTransferModal">
      <div class="flex flex-col gap-4 justify-start">
        <span class="font-bold text-xl sm:text-2xl">Transfer Token</span>
        <div class="form-control w-full">
          <label class="label">
            <span class="label-text">Select Token</span>
          </label>
          <select class="select select-bordered" v-model="selectedToken">
            <option value="USDT">USDT</option>
            <option value="USDC">USDC</option>
          </select>
        </div>
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
            v-if="isConfirmingTokenTransfer || tokenTransferLoading"
            class="w-full sm:w-44"
            color="primary"
          />
          <button v-else class="btn btn-primary w-full sm:w-44 text-center" @click="transferToken">
            Transfer Token
          </button>
        </div>
      </div>
    </ModalComponent>
  </div>
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
import { encodeFunctionData, parseEther, type Address, parseUnits } from 'viem'
import AddressToolTip from '@/components/AddressToolTip.vue'
// import BankManagement from './BankManagement.vue'
import BankABI from '@/artifacts/abi/bank.json'
import BoDABI from '@/artifacts/abi/bod.json'

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
const selectedToken = ref('USDT')
const tokenAmount = ref('')
const tokenRecipient = ref('')

const {
  writeContract: writeTokenDeposit,
  isPending: tokenDepositLoading,
  data: tokenDepositHash
} = useWriteContract()

const { isLoading: isConfirmingTokenDeposit } = useWaitForTransactionReceipt({
  hash: tokenDepositHash
})

const {
  writeContract: writeTokenTransfer,
  isPending: tokenTransferLoading,
  data: tokenTransferHash
} = useWriteContract()

const { isLoading: isConfirmingTokenTransfer } = useWaitForTransactionReceipt({
  hash: tokenTransferHash
})

const depositToken = async () => {
  if (!props.team.bankAddress || !tokenAmount.value) return
  writeTokenDeposit({
    address: props.team.bankAddress as Address,
    abi: BankABI,
    functionName: 'depositToken',
    args: [selectedToken.value, parseUnits(tokenAmount.value, 18)]
  })
}

const transferToken = async () => {
  if (!props.team.bankAddress || !tokenAmount.value || !tokenRecipient.value) return
  writeTokenTransfer({
    address: props.team.bankAddress as Address,
    abi: BankABI,
    functionName: 'transferToken',
    args: [selectedToken.value, tokenRecipient.value as Address, parseUnits(tokenAmount.value, 18)]
  })
}

watch(isConfirmingTokenDeposit, (newIsConfirming, oldIsConfirming) => {
  if (!newIsConfirming && oldIsConfirming) {
    addSuccessToast('Token deposited successfully')
    tokenDepositModal.value = false
    tokenAmount.value = ''
  }
})

watch(isConfirmingTokenTransfer, (newIsConfirming, oldIsConfirming) => {
  if (!newIsConfirming && oldIsConfirming) {
    addSuccessToast('Token transferred successfully')
    tokenTransferModal.value = false
    tokenAmount.value = ''
    tokenRecipient.value = ''
  }
})

onMounted(async () => {
  if (props.team.bankAddress) fetchBalance()
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
