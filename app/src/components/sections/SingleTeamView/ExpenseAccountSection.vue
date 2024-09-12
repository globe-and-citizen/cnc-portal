<template>
  <div
    v-if="team.expenseAccountAddress"
    class="stats bg-green-100 flex text-primary-content border-outline flex-col justify-center items-center p-5"
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
          :class="`${team.ownerAddress == useUserDataStore().address ? 'badge-primary' : 'badge-secondary'}`"
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
    <div class="flex items-center pt-3">
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
          {{ contractBalance }} <span class="text-xs">{{ NETWORK.currencySymbol }}</span>
        </div>
      </div>

      <div class="pl-3">
        <div class="stat-title">Max Limit</div>
        <div v-if="isLoadingMaxLimit || !maxLimit" class="stat-value mt-1 pr-3">
          <span class="loading loading-dots loading-xs" data-test="max-limit-loading"></span>
        </div>
        <div v-else class="stat-value text-3xl mt-2" data-test="max-limit">
          {{ maxLimit }} <span class="text-xs">{{ NETWORK.currencySymbol }}</span>
        </div>
      </div>
    </div>
    <div class="stat-actions flex justify-center gap-2 items-center">
      <button
        class="btn btn-xs btn-secondary"
        :disabled="!approvedAddresses.has(useUserDataStore().address)"
        v-if="team.bankAddress && approvedAddresses"
        @click="transferModal = true"
      >
        Transfer
      </button>
      <button
        class="btn btn-xs btn-secondary"
        v-if="team.bankAddress && contractOwnerAddress == useUserDataStore().address"
        @click="setLimitModal = true"
      >
        Set Limit
      </button>
      <button
        class="btn btn-xs btn-secondary"
        v-if="team.bankAddress && contractOwnerAddress == useUserDataStore().address"
        @click="approveUsersModal = true"
      >
        Approve Users
      </button>
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
        :loading="false"
        :bank-balance="`${contractBalance}`"
      />
    </ModalComponent>
    <ModalComponent v-model="setLimitModal">
      <SetLimitForm
        v-if="setLimitModal"
        :loading="isLoadingSetLimit"
        @close-modal="() => (setLimitModal = false)"
        @set-limit="setExepenseAccountLimit"
      />
    </ModalComponent>
    <ModalComponent v-model="approveUsersModal">
      <ApproveUsersForm
        :loading-approve="isLoadingApproveAddress"
        :loading-disapprove="isLoadingDisapproveAddress"
        :approved-addresses="approvedAddresses"
        :unapproved-addresses="unapprovedAddresses"
        @approve-address="approveAddress"
        @disapprove-address="disapproveAddress"
        @close-modal="approveUsersModal = false"
      />
    </ModalComponent>
  </div>

  <!-- Expense Account Not Yet Created -->
  <div class="flex justify-center items-center" v-if="!team.expenseAccountAddress">
    <LoadingButton
      class="w-24"
      color="primary"
      v-if="isLoadingDeploy"
      data-test="loading-create-expense-account"
    />
    <button
      v-else
      class="btn btn-primary"
      @click="async () => await deployExpenseAccount()"
      data-test="create-expense-account"
    >
      Create Expense Account
    </button>
  </div>
</template>

<script setup lang="ts">
//#region imports
import { onMounted, ref, watch } from 'vue'
import type { Team, User } from '@/types'
import {
  useDeployExpenseAccountContract,
  useExpenseAccountGetOwner,
  useExpenseAccountGetBalance,
  useExpenseAccountIsApprovedAddress,
  useExpenseAccountTransfer,
  useExpenseAccountSetLimit,
  useExpenseAccountApproveAddress,
  useExpenseAccountDisapproveAddress,
  useExpenseAccountGetMaxLimit
} from '@/composables/useExpenseAccount'
import { NETWORK } from '@/constant'
import TransferFromBankForm from '@/components/forms/TransferFromBankForm.vue'
import ModalComponent from '@/components/ModalComponent.vue'
import SetLimitForm from '@/components/sections/SingleTeamView/forms/SetLimitForm.vue'
import ApproveUsersForm from './forms/ApproveUsersForm.vue'
import LoadingButton from '@/components/LoadingButton.vue'
import { useClipboard } from '@vueuse/core'
import ToolTip from '@/components/ToolTip.vue'
import { ClipboardDocumentListIcon, ClipboardDocumentCheckIcon } from '@heroicons/vue/24/outline'
import { useUserDataStore, useToastStore } from '@/stores'
import { useCustomFetch } from '@/composables/useCustomFetch'
import { parseError } from '@/utils'
//#endregion imports

//#region variable declarations
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
const expenseAccountAddress = ref<{
  expenseAccountAddress: string | null
}>({ expenseAccountAddress: null })

const { addSuccessToast, addErrorToast } = useToastStore()
const { copy, copied, isSupported } = useClipboard()
//#endregion variable declarations

//#region expense account composable
const {
  execute: executeExpenseAccountGetMaxLimit,
  isLoading: isLoadingMaxLimit,
  data: maxLimit,
  error: errorGetMaxLimit
} = useExpenseAccountGetMaxLimit()

const {
  execute: executeExpenseAccountApproveAddress,
  isLoading: isLoadingApproveAddress,
  isSuccess: isSuccessApproveAddress,
  error: errorApproveAddress
} = useExpenseAccountApproveAddress()

const {
  execute: executeExpenseAccountDisapproveAddress,
  isLoading: isLoadingDisapproveAddress,
  isSuccess: isSuccessDisapproveAddress,
  error: errorDisapproveAddress
} = useExpenseAccountDisapproveAddress()

const {
  execute: executeExpenseAccountSetLimit,
  isLoading: isLoadingSetLimit,
  isSuccess: isSuccessMaxLimit,
  error: errorSetMaxLimit
} = useExpenseAccountSetLimit()

const {
  execute: executeExpenseAccountTransfer,
  error: errorTransfer,
  isSuccess: isSuccessTransfer
} = useExpenseAccountTransfer()

const {
  data: contractAddress,
  execute: executeDeployExpenseAccount,
  isLoading: isLoadingDeploy,
  isSuccess: isSuccessDeploy,
  error: errorDeploy
} = useDeployExpenseAccountContract()

const {
  data: contractOwnerAddress,
  execute: executeExpenseAccountGetOwner,
  error: errorGetOwner
} = useExpenseAccountGetOwner()

const {
  data: contractBalance,
  execute: executeExpenseAccountGetBalance,
  isLoading: isLoadingBalance,
  error: errorGetContractBalance
} = useExpenseAccountGetBalance()

const { data: isApprovedAddress, execute: executeExpenseAccountIsApprovedAddress } =
  useExpenseAccountIsApprovedAddress()
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

const { execute: executeUpdateTeam, data: teamU } = useCustomFetch(`teams/${props.team.id}`, {
  immediate: false
})
  .put(expenseAccountAddress)
  .json()

//#region helper functions
const deployExpenseAccount = async () => {
  await executeDeployExpenseAccount()
  team.value.expenseAccountAddress = contractAddress.value
  //API call here
  expenseAccountAddress.value.expenseAccountAddress = contractAddress.value
  await executeUpdateTeam()
}

const init = async () => {
  await getExpenseAccountBalance()
  await getExpenseAccountMaxLimit()
  await getExpenseAccountOwner()
  await checkApprovedAddresses()
}

const getExpenseAccountBalance = async () => {
  if (team.value.expenseAccountAddress)
    await executeExpenseAccountGetBalance(team.value.expenseAccountAddress)
}

const getExpenseAccountOwner = async () => {
  if (team.value.expenseAccountAddress)
    await executeExpenseAccountGetOwner(team.value.expenseAccountAddress)
}

const transferFromExpenseAccount = async (to: string, amount: string) => {
  if (team.value.expenseAccountAddress) {
    await executeExpenseAccountTransfer(team.value.expenseAccountAddress, to, amount)
    await executeExpenseAccountGetBalance(team.value.expenseAccountAddress)
  }
}

const setExepenseAccountLimit = async (amount: any) => {
  if (team.value.expenseAccountAddress) {
    await executeExpenseAccountSetLimit(team.value.expenseAccountAddress, amount.value)
    await getExpenseAccountMaxLimit()
  }
}

const approveAddress = async (address: string) => {
  if (team.value.expenseAccountAddress) {
    await executeExpenseAccountApproveAddress(team.value.expenseAccountAddress, address)
    await checkApprovedAddresses()
  }
}

const disapproveAddress = async (address: string) => {
  if (team.value.expenseAccountAddress) {
    await executeExpenseAccountDisapproveAddress(team.value.expenseAccountAddress, address)
    await checkApprovedAddresses()
  }
}

const checkApprovedAddresses = async () => {
  if (team.value.members && team.value.expenseAccountAddress)
    for (const member of team.value.members) {
      await executeExpenseAccountIsApprovedAddress(team.value.expenseAccountAddress, member.address)
      if (isApprovedAddress.value) {
        approvedAddresses.value.add(member.address)
        unapprovedAddresses.value.delete(member.address)
      } else {
        unapprovedAddresses.value.add(member.address)
        approvedAddresses.value.delete(member.address)
      }
    }
}

const getExpenseAccountMaxLimit = async () => {
  if (team.value.expenseAccountAddress)
    await executeExpenseAccountGetMaxLimit(team.value.expenseAccountAddress)
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
//#endregion helper functions

//#region watch error
watch(errorDeploy, (newVal) => {
  if (newVal)
    addErrorToast(
      errorDeploy.value.reason ? errorDeploy.value.reason : 'Error Deploying Creating Account'
    )
})

watch(errorSetMaxLimit, (newVal) => {
  if (newVal)
    addErrorToast(
      errorSetMaxLimit.value.reason ? errorSetMaxLimit.value.reason : 'Error Setting Max Limit'
    )
})

watch(errorApproveAddress, (newVal) => {
  if (newVal)
    addErrorToast(
      errorApproveAddress.value.reason
        ? errorApproveAddress.value.reason
        : 'Error Approving Address'
    )
})

watch(errorDisapproveAddress, (newVal) => {
  if (newVal)
    addErrorToast(
      errorDisapproveAddress.value.reason
        ? errorDisapproveAddress.value.reason
        : 'Error Disapproving Address'
    )
})

watch(errorTransfer, (newVal) => {
  if (newVal)
    addErrorToast(errorTransfer.value.reason ? errorTransfer.value.reason : 'Error Making Transfer')
})

watch(errorGetContractBalance, (newVal) => {
  if (newVal)
    addErrorToast(
      errorGetContractBalance.value.reason
        ? errorGetContractBalance.value.reason
        : 'Error Getting Contract Balance'
    )
})

watch(errorGetOwner, (newVal) => {
  if (newVal)
    addErrorToast(
      errorGetOwner.value.reason ? errorGetOwner.value.reason : 'Error Getting Contract Owner'
    )
})

watch(errorGetMaxLimit, (newVal) => {
  if (newVal)
    addErrorToast(
      errorGetMaxLimit.value.reason ? errorGetMaxLimit.value.reason : 'Error Getting Max Limit'
    )
})
//#endregion watch error

//#region watch success
watch(isSuccessTransfer, (newVal) => {
  if (newVal) addSuccessToast('Transfer Successful')
})

watch(isSuccessApproveAddress, (newVal) => {
  if (newVal) addSuccessToast('Address Successfully Approved')
})

watch(isSuccessDisapproveAddress, (newVal) => {
  if (newVal) addSuccessToast('Address Successfully Disapproved')
})

watch(isSuccessMaxLimit, (newVal) => {
  if (newVal) addSuccessToast('Max Limit Successfully Set')
})

watch(isSuccessDeploy, (newVal) => {
  if (newVal) addSuccessToast('Expense Account Successfully Created')
})

watch(
  () => team.value.expenseAccountAddress,
  async (newVal) => {
    if (newVal) await init()
  }
)
//#endregion watch success

onMounted(async () => {
  console.log('team.value.expenseAccountAddress: ', team.value.expenseAccountAddress)
  await init()
})
</script>
