<template>
  <div class="flex flex-col gap-y-4 py-6 lg:px-4 sm:px-6">
    <span class="text-2xl sm:text-3xl font-bold">Team Bank Account</span>
    <div class="divider m-0"></div>
    <div class="space-y-4">
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span class="text-sm sm:text-base">Bank Balance</span>
          <div class="font-extrabold text-3xl sm:text-4xl">
            <span class="inline-block w-16 h-10">
              <span class="loading loading-spinner loading-lg" v-if="balanceLoading"></span>
              <span v-else>{{ teamBalance?.formatted }} </span>
            </span>
            <span class="text-xs">{{ NETWORK.currencySymbol }}</span>
          </div>
          <span class="text-xs sm:text-sm">≈ $ 1.28</span>
        </div>
        <div class="flex flex-wrap gap-2 sm:gap-4">
          <Button
            class="btn btn-sm btn-secondary"
            v-if="team.bankAddress"
            @click="() => (depositModal = true)"
          >
            Deposit
          </Button>
          <Button
            class="btn btn-sm btn-secondary"
            v-if="team.bankAddress"
            @click="() => (pushTipModal = true)"
          >
            Tip the Team
          </Button>
          <Button
            class="btn btn-sm btn-secondary"
            v-if="team.bankAddress && (team.ownerAddress == useUserDataStore().address || isBod)"
            @click="transferModal = true"
          >
            Transfer
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
        @searchMembers="(input) => searchUsers({ name: '', address: input })"
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
            v-if="isConfirmingPushTip || pushTipLoading"
            class="w-full sm:w-44"
            color="primary"
          />
          <button
            v-if="!(isConfirmingPushTip || pushTipLoading)"
            class="btn btn-primary w-full sm:w-44 text-center"
            @click="
              async () => {
                if (owner == team.boardOfDirectorsAddress) {
                  addPushTipAction('Pushed tips to all team members')
                } else {
                  const members = team.members.map((member) => member.address)
                  pushTip({
                    address: team.bankAddress as Address,
                    abi: BankABI,
                    functionName: 'pushTip',
                    args: [members, ethers.parseEther(tipAmount.toString())],
                    value: ethers.parseEther(tipAmount.toString())
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
import { BankService } from '@/services/bankService'
import type { Address } from 'viem'
import { EthersJsAdapter } from '@/adapters/web3LibraryAdapter'
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
const ethers = EthersJsAdapter.getInstance()

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

watch(isConfirmedPushTip, (isConfirming, wasConfirming) => {
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
  (boardOfDirectors.value as Array<Address>)?.includes(useUserDataStore().address as Address)
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

const bankService = new BankService()

const addTransferAction = async (to: string, amount: string, description: string) => {
  await executeAddAction(props.team, {
    targetAddress: props.team.bankAddress! as Address,
    data: (await bankService.getFunctionSignature(props.team.bankAddress!, 'transfer', [
      to,
      ethers.parseEther(amount)
    ])) as Address,
    description
  })
  if (errorAddAction.value) return
  transferModal.value = false
}
const addPushTipAction = async (description: string) => {
  await executeAddAction(props.team, {
    targetAddress: props.team.bankAddress! as Address,
    data: (await bankService.getFunctionSignature(props.team.bankAddress!, 'pushTip', [
      membersAddress.value,
      ethers.parseEther(tipAmount.value.toString())
    ])) as Address,
    description
  })
  if (errorAddAction.value) return

  pushTipModal.value = false
  tipAmount.value = 0
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
  }
})

const depositToBank = async (amount: string) => {
  if (props.team.bankAddress) {
    sendTransaction({
      to: props.team.bankAddress as Address,
      value: ethers.parseEther(amount)
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
    args: [to, ethers.parseEther(amount)]
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

onMounted(async () => {
  if (props.team.bankAddress) fetchBalance()
  await getOwner()
  await executeGetBoardOfDirectors()
})
const membersAddress = computed(() => {
  return props.team.members?.map((member: { address: string }) => member.address) ?? []
})
</script>
