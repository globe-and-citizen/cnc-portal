<template>
  <div
    v-if="team.expenseAccountAddress"
    class="stats bg-green-100 flex text-primary-content border-outline flex-col justify-center items-center p-5 overflow-visible"
  >
    <span class="flex gap-2 items-center">
      <ToolTip
        data-test="expense-account-address-tooltip"
        content="Click to see address in block explorer"
      >
        <span
          class="badge badge-sm cursor-pointer"
          data-test="expense-account-address"
          @click="openExplorer(team.expenseAccountAddress)"
          :class="`${team.ownerAddress == currentUserAddress ? 'badge-primary' : 'badge-secondary'}`"
          >{{ team.expenseAccountAddress }}</span
        >
      </ToolTip>
      <ToolTip
        data-test="copy-address-tooltip"
        :content="copied ? 'Copied!' : 'Click to copy address'"
      >
        <ClipboardDocumentListIcon
          v-if="isSupported && !copied"
          class="size-5 cursor-pointer"
          @click="copy(team.expenseAccountAddress)"
        />
        <ClipboardDocumentCheckIcon v-if="copied" class="size-5" />
      </ToolTip>
    </span>
    <div class="flex items-center pt-3" style="border-width: 0">
      <div>
        <div class="stat-title pr-3">Balance</div>
        <div
          v-if="isLoadingBalance || !contractBalance"
          class="stat-value mt-1 border-r border-gray-400 pr-3"
        >
          <span class="loading loading-dots loading-xs" data-test="balance-loading"> </span>
        </div>
        <div
          v-else
          class="stat-value text-3xl mt-2 border-r border-gray-400 pr-3"
          data-test="contract-balance"
        >
          {{ contractBalance.formatted }} <span class="text-xs">{{ NETWORK.currencySymbol }}</span>
        </div>
      </div>

      <div class="pl-3">
        <div class="stat-title">Max Limit</div>
        <div v-if="!maxLimit && maxLimit != 0n" class="stat-value mt-1 pr-3">
          <span class="loading loading-dots loading-xs" data-test="max-limit-loading"></span>
        </div>
        <div
          class="stat-value text-3xl mt-2"
          data-test="max-limit"
          v-if="maxLimit || maxLimit == 0n"
        >
          {{ formatEther(maxLimit as bigint) }}
          <span class="text-xs">{{ NETWORK.currencySymbol }}</span>
        </div>
      </div>
    </div>
    <div class="stat-actions flex justify-center gap-2 items-center mt-8">
      <ButtonUI
        size="xs"
        variant="secondary"
        :disabled="!approvedAddresses.has(currentUserAddress)"
        v-if="approvedAddresses"
        @click="transferModal = true"
        data-test="transfer-button"
      >
        Transfer
      </ButtonUI>
      <ButtonUI
        size="xs"
        variant="secondary"
        v-if="contractOwnerAddress == currentUserAddress || isBodAction()"
        @click="setLimitModal = true"
        data-test="set-limit-button"
      >
        Set Limit
      </ButtonUI>
      <ButtonUI
        size="xs"
        variant="secondary"
        v-if="contractOwnerAddress == currentUserAddress || isBodAction()"
        @click="approveUsersModal = true"
        data-test="approve-users-button"
      >
        Approve Users
      </ButtonUI>
    </div>
    <ModalComponent v-model="transferModal">
      <TransferFromBankForm
        v-if="transferModal"
        @close-modal="() => (transferModal = false)"
        @transfer="
          async (to: string, amount: string) => {
            transferFromExpenseAccount(to, amount)
          }
        "
        @searchMembers="(input) => searchUsers({ name: '', address: input })"
        :filteredMembers="foundUsers"
        :loading="isLoadingTransfer || isConfirmingTransfer"
        :bank-balance="`${contractBalance?.formatted}`"
        service="Expense Account"
      />
    </ModalComponent>
    <ModalComponent v-model="setLimitModal">
      <SetLimitForm
        v-if="setLimitModal"
        :loading="
          isLoadingSetLimit ||
          (isLoadingAddAction && action === 'set-max-limit') ||
          isConfirmingSetMaxLimit
        "
        :is-bod-action="isBodAction()"
        @close-modal="() => (setLimitModal = false)"
        @set-limit="setExpenseAccountLimit"
      />
    </ModalComponent>
    <ModalComponent v-model="approveUsersModal">
      <ApproveUsersForm
        v-if="approveUsersModal"
        :loading-approve="
          isLoadingApproveAddress ||
          (isLoadingAddAction && action === 'approve-users') ||
          isConfirmingApproveAddress
        "
        :loading-disapprove="
          isLoadingDisapproveAddress ||
          (isLoadingAddAction && action === 'approve-users') ||
          isConfirmingDisapproveAddress
        "
        :approved-addresses="approvedAddresses"
        :unapproved-addresses="unapprovedAddresses"
        :is-bod-action="isBodAction()"
        @approve-address="approveAddress"
        @disapprove-address="disapproveAddress"
        @close-modal="approveUsersModal = false"
      />
    </ModalComponent>
  </div>

  <!-- Expense Account Not Yet Created -->
</template>

<script setup lang="ts">
//#region imports
import { onMounted, ref, watch } from 'vue'
import type { Team, User } from '@/types'
import { NETWORK } from '@/constant'
import TransferFromBankForm from '@/components/forms/TransferFromBankForm.vue'
import ModalComponent from '@/components/ModalComponent.vue'
import SetLimitForm from '@/components/sections/SingleTeamView/forms/SetLimitForm.vue'
import ApproveUsersForm from './forms/ApproveUsersForm.vue'
import { useClipboard } from '@vueuse/core'
import ToolTip from '@/components/ToolTip.vue'
import { ClipboardDocumentListIcon, ClipboardDocumentCheckIcon } from '@heroicons/vue/24/outline'
import { useUserDataStore, useToastStore } from '@/stores'
import { useCustomFetch } from '@/composables/useCustomFetch'
import { parseError } from '@/utils'
import { useAddAction } from '@/composables/bod'
import { formatEther } from 'viem'
import { encodeFunctionData, parseEther, type Address } from 'viem'
import {
  useBalance,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract
} from '@wagmi/vue'
import BoDABI from '@/artifacts/abi/bod.json'
import expenseAccountABI from '@/artifacts/abi/expense-account.json'
import { readContract } from '@wagmi/core'
import { config } from '@/wagmi.config'
import ButtonUI from '@/components/ButtonUI.vue'

//#endregion imports

//#region variable declarations
const currentUserAddress = useUserDataStore().address
const props = defineProps<{ team: Partial<Team> }>()
const team = ref(props.team)
const approvedAddresses = ref<Set<string>>(new Set())
const transferModal = ref(false)
const setLimitModal = ref(false)
const approveUsersModal = ref(false)
const foundUsers = ref<User[]>([])
const searchUserName = ref('')
const searchUserAddress = ref('')
const unapprovedAddresses = ref<Set<string>>(new Set())
const action = ref('')

const { addSuccessToast, addErrorToast } = useToastStore()
const { copy, copied, isSupported } = useClipboard()
//#endregion variable declarations

//#region expense account composable
const {
  execute: executeAddAction,
  isLoading: isLoadingAddAction,
  error: errorAddAction,
  isSuccess: isSuccessAddAction
} = useAddAction()
const { data: boardOfDirectors, refetch: executeGetBoardOfDirectors } = useReadContract({
  functionName: 'getBoardOfDirectors',
  address: team.value.boardOfDirectorsAddress as Address,
  abi: BoDABI
})
const {
  refetch: executeExpenseAccountGetMaxLimit,
  data: maxLimit,
  error: errorGetMaxLimit
} = useReadContract({
  functionName: 'maxLimit',
  address: team.value.expenseAccountAddress as Address,
  abi: expenseAccountABI
})
watch(maxLimit, () => {
  console.log('maxLimit', maxLimit.value)
})

const {
  writeContract: executeExpenseAccountApproveAddress,
  isPending: isLoadingApproveAddress,
  error: errorApproveAddress,
  data: approveAddressHash
} = useWriteContract()
const { isSuccess: isConfirmedApproveAddress, isLoading: isConfirmingApproveAddress } =
  useWaitForTransactionReceipt({
    hash: approveAddressHash
  })

watch(isConfirmingApproveAddress, async (isConfirming, wasConfirming) => {
  if (!isConfirming && wasConfirming && isConfirmedApproveAddress.value) {
    addSuccessToast('Address Successfully Approved')
    await checkApprovedAddresses()

    approveUsersModal.value = false
  }
})

const {
  writeContract: executeExpenseAccountDisapproveAddress,
  isPending: isLoadingDisapproveAddress,
  error: errorDisapproveAddress,
  data: disapproveAddressHash
} = useWriteContract()
const { isSuccess: isConfirmedDisapproveAddress, isLoading: isConfirmingDisapproveAddress } =
  useWaitForTransactionReceipt({
    hash: disapproveAddressHash
  })
watch(isConfirmingDisapproveAddress, async (isConfirming, wasConfirming) => {
  if (!isConfirming && wasConfirming && isConfirmedDisapproveAddress.value) {
    addSuccessToast('Address Successfully Disapproved')
    await checkApprovedAddresses()
    approveUsersModal.value = false
  }
})

const {
  writeContract: executeExpenseAccountSetLimit,
  isPending: isLoadingSetLimit,
  data: setMaxLimitHash,
  error: errorSetMaxLimit
} = useWriteContract()
const { isSuccess: isConfirmedSetMaxLimit, isLoading: isConfirmingSetMaxLimit } =
  useWaitForTransactionReceipt({
    hash: setMaxLimitHash
  })
watch(isConfirmingSetMaxLimit, async (isConfirming, wasConfirming) => {
  if (!isConfirming && wasConfirming && isConfirmedSetMaxLimit.value) {
    addSuccessToast('Max Limit Successfully Set')
    await getExpenseAccountMaxLimit()
    setLimitModal.value = false
  }
})

const {
  writeContract: executeExpenseAccountTransfer,
  isPending: isLoadingTransfer,
  error: errorTransfer,
  data: transferHash
} = useWriteContract()

const { isLoading: isConfirmingTransfer, isSuccess: isConfirmedTransfer } =
  useWaitForTransactionReceipt({
    hash: transferHash
  })
watch(isConfirmingTransfer, async (isConfirming, wasConfirming) => {
  if (!isConfirming && wasConfirming && isConfirmedTransfer.value) {
    addSuccessToast('Transfer Successful')
    await getExpenseAccountBalance()
    transferModal.value = false
  }
})

const {
  data: contractOwnerAddress,
  refetch: executeExpenseAccountGetOwner,
  error: errorGetOwner
} = useReadContract({
  functionName: 'owner',
  address: team.value.expenseAccountAddress as Address,
  abi: expenseAccountABI
})

const {
  data: contractBalance,
  refetch: executeExpenseAccountGetBalance,
  isLoading: isLoadingBalance,
  error: errorGetContractBalance
} = useBalance({
  address: team.value.expenseAccountAddress as Address
})

//#endregion expense account composable

const { execute: executeSearchUser } = useCustomFetch('user/search', {
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

//#region helper functions

const init = async () => {
  await getExpenseAccountBalance()
  await getExpenseAccountMaxLimit()
  await getExpenseAccountOwner()
  await checkApprovedAddresses()
  if (team.value.boardOfDirectorsAddress) await executeGetBoardOfDirectors()
}

const getExpenseAccountBalance = async () => {
  if (team.value.expenseAccountAddress) await executeExpenseAccountGetBalance()
}

const getExpenseAccountOwner = async () => {
  if (team.value.expenseAccountAddress) await executeExpenseAccountGetOwner()
}

const transferFromExpenseAccount = async (to: string, amount: string) => {
  if (team.value.expenseAccountAddress) {
    executeExpenseAccountTransfer({
      address: team.value.expenseAccountAddress as Address,
      args: [to, parseEther(amount)],
      abi: expenseAccountABI,
      functionName: 'transfer'
    })
  }
}

const setExpenseAccountLimit = async (amount: string, description: string) => {
  if (team.value.expenseAccountAddress) {
    if (isBodAction()) {
      action.value = 'set-max-limit'
      const functionSignature = encodeFunctionData({
        functionName: 'setMaxLimit',
        abi: expenseAccountABI,
        args: [parseEther(amount)]
      })
      await executeAddAction(props.team, {
        targetAddress: props.team.expenseAccountAddress as Address,
        data: functionSignature as Address,
        description
      })
    } else {
      executeExpenseAccountSetLimit({
        address: team.value.expenseAccountAddress as Address,
        args: [parseEther(amount)],
        abi: expenseAccountABI,
        functionName: 'setMaxLimit'
      })
      await getExpenseAccountMaxLimit()
    }
  }
}

const approveAddress = async (address: string, description: string) => {
  if (team.value.expenseAccountAddress) {
    if (isBodAction()) {
      action.value = 'approve-users'
      const functionSignature = encodeFunctionData({
        functionName: 'approveAddress',
        abi: expenseAccountABI,
        args: [address]
      })
      await executeAddAction(props.team, {
        targetAddress: props.team.expenseAccountAddress as Address,
        data: functionSignature as Address,
        description
      })
      action.value = ''
      if (isSuccessAddAction.value) approveUsersModal.value = false
    } else {
      executeExpenseAccountApproveAddress({
        address: team.value.expenseAccountAddress as Address,
        args: [address],
        abi: expenseAccountABI,
        functionName: 'approveAddress'
      })
    }
  }
}

const isBodAction = () => {
  if (
    (contractOwnerAddress.value as string)?.toLocaleLowerCase() ===
      team.value.boardOfDirectorsAddress?.toLocaleLowerCase() &&
    boardOfDirectors.value
  )
    return (boardOfDirectors.value as Array<Address>)
      .map((address) => address.toLocaleLowerCase())
      .includes(currentUserAddress.toLocaleLowerCase())

  return false
}

const disapproveAddress = async (address: string, description: string) => {
  if (team.value.expenseAccountAddress) {
    if (isBodAction()) {
      action.value = 'approve-users'
      const functionSignature = encodeFunctionData({
        functionName: 'disapproveAddress',
        abi: expenseAccountABI,
        args: [address]
      })
      await executeAddAction(props.team, {
        targetAddress: props.team.expenseAccountAddress as Address,
        data: functionSignature as Address,
        description
      })
      action.value = ''
      if (isSuccessAddAction.value) approveUsersModal.value = false
    } else {
      executeExpenseAccountDisapproveAddress({
        address: team.value.expenseAccountAddress as Address,
        args: [address],
        abi: expenseAccountABI,
        functionName: 'disapproveAddress'
      })
    }
  }
}

const checkApprovedAddresses = async () => {
  if (team.value.members && team.value.expenseAccountAddress)
    for (const member of team.value.members) {
      const isApprovedAddress = await readContract(config, {
        functionName: 'approvedAddresses',
        address: team.value.expenseAccountAddress as Address,
        abi: expenseAccountABI,
        args: [member.address]
      })
      if (isApprovedAddress) {
        approvedAddresses.value.add(member.address)
        unapprovedAddresses.value.delete(member.address)
      } else {
        unapprovedAddresses.value.add(member.address)
        approvedAddresses.value.delete(member.address)
      }
    }
}

const getExpenseAccountMaxLimit = async () => {
  if (team.value.expenseAccountAddress) await executeExpenseAccountGetMaxLimit()
}

const openExplorer = (address: string) => {
  window.open(`${NETWORK.blockExplorerUrl}/address/${address}`, '_blank')
}

const searchUsers = async (input: { name: string; address: string }) => {
  try {
    searchUserName.value = input.name
    searchUserAddress.value = input.address
    if (searchUserName.value || searchUserAddress.value) {
      await executeSearchUser()
    }
  } catch (error) {
    addErrorToast(parseError(error))
  }
}

const errorMessage = (error: {}, message: string) =>
  'reason' in error ? (error.reason as string) : message
//#endregion helper functions

//#region watch error
watch(errorAddAction, (newVal) => {
  if (newVal) addErrorToast(errorMessage(newVal, 'Error Adding Action'))
})

watch(errorSetMaxLimit, (newVal) => {
  if (newVal) addErrorToast(errorMessage(newVal, 'Error Setting Max Limit'))
})

watch(errorApproveAddress, (newVal) => {
  if (newVal) addErrorToast(errorMessage(newVal, 'Error Approving Address'))
})

watch(errorDisapproveAddress, (newVal) => {
  if (newVal) addErrorToast(errorMessage(newVal, 'Error Disapproving Address'))
})

watch(errorTransfer, (newVal) => {
  if (newVal) addErrorToast(errorMessage(newVal, 'Error Making Transfer'))
})

watch(errorGetContractBalance, (newVal) => {
  if (newVal) addErrorToast(errorMessage(newVal, 'Error Getting Contract Balance'))
})

watch(errorGetOwner, (newVal) => {
  if (newVal) addErrorToast(errorMessage(newVal, 'Error Getting Contract Owner'))
})

watch(errorGetMaxLimit, (newVal) => {
  if (newVal) addErrorToast(errorMessage(newVal, 'Error Getting Max Limit'))
})
//#endregion watch error

//#region watch success
watch(isSuccessAddAction, (newVal) => {
  if (newVal) addSuccessToast('Action Added Successfully')
})

watch(
  () => team.value.expenseAccountAddress,
  async (newVal) => {
    if (newVal) await init()
  }
)
//#endregion watch success

onMounted(async () => {
  await init()
})
</script>
