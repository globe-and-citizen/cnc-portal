<template>
  <!-- Expense Account Created -->
  <div v-if="contractOwnerAddress">
    <div class="stats bg-green-100 flex text-primary-content border-outline flex-col justify-center items-center p-5">
      <span v-if="team.bankAddress">
        <ToolTip data-test="bank-address-tooltip" content="Click to see address in block explorer">
          <span
            class="badge badge-sm cursor-pointer"
            data-test="team-bank-address"
            @click="openExplorer(EXPENSE_ACCOUNT_ADDRESS)"
            :class="`${team.ownerAddress == useUserDataStore().address ? 'badge-primary' : 'badge-secondary'}`"
            >{{ EXPENSE_ACCOUNT_ADDRESS }}</span
          >
        </ToolTip>
        <ToolTip
          data-test="copy-address-tooltip"
          :content="copied ? 'Copied!' : 'Click to copy address'"
        >
          <ClipboardDocumentListIcon
            v-if="isSupported && !copied"
            class="size-5 cursor-pointer"
            @click="copy(EXPENSE_ACCOUNT_ADDRESS)"
          />
          <ClipboardDocumentCheckIcon v-if="copied" class="size-5" />
        </ToolTip>
      </span>
      <div class="flex items-center">
        <span
          class="loading loading-dots loading-xs"
          data-test="balance-loading"
          v-if="isLoadingBalance"
        ></span>
        <div v-else>
          <div class="stat-title">Balance</div>
          <div class="stat-value text-3xl mt-2 border-r border-gray-400 pr-3">
            {{ contractBalance }} <span class="text-xs">{{ NETWORK.currencySymbol }}</span>
          </div>
        </div>
        <span
          class="loading loading-dots loading-xs"
          data-test="balance-loading"
          v-if="isLoadingMaxLimit"
        ></span>
        <div v-else class="pl-3">
          <div class="stat-title">Max Limit</div>
          <div class="stat-value text-3xl mt-2">
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
          @close-modal="() => setLimitModal = false"
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

    <div></div>
  </div>

  <!-- Expense Account Not Yet Created -->
  <div class="flex justify-center items-center" v-else>
    <LoadingButton class="w-24"color="primary" v-if="isLoadingDeploy"/>
    <button
      v-else
      class="btn btn-primary"
      @click="async () => await deployExpenseAccount()"
      data-test="createExpenseAccount"
    >
      Create Expense Account
    </button>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch, computed } from "vue";
import type { Team, User } from "@/types";
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
} from "@/composables/useExpenseAccount";
import { EXPENSE_ACCOUNT_ADDRESS, NETWORK } from "@/constant";
import TransferFromBankForm from '@/components/forms/TransferFromBankForm.vue'
import ModalComponent from "@/components/ModalComponent.vue";
import SetLimitForm from '@/components/sections/SingleTeamView/forms/SetLimitForm.vue'
import ApproveUsersForm from "./forms/ApproveUsersForm.vue";
import LoadingButton from '@/components/LoadingButton.vue'
import { useClipboard } from '@vueuse/core'
import ToolTip from '@/components/ToolTip.vue'
import { ClipboardDocumentListIcon, ClipboardDocumentCheckIcon } from '@heroicons/vue/24/outline'
import { useUserDataStore, useToastStore } from '@/stores'
import { useCustomFetch } from '@/composables/useCustomFetch'

const props = defineProps<{team: Partial<Team>}>()
const approvedAddresses = ref<Set<string>>(new Set())
const transferModal = ref(false)
const setLimitModal = ref(false)
const approveUsersModal = ref(false)
const foundUsers = ref<User[]>([])
const searchUserName = ref('')
const searchUserAddress = ref('')
const unapprovedAddresses = ref<Set<string>>(new Set())

const { addSuccessToast, addErrorToast } = useToastStore()
const { copy, copied, isSupported } = useClipboard()

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
  execute: executeExpenseAccountGetMaxLimit,
  isLoading: isLoadingMaxLimit,
  data: maxLimit
} = useExpenseAccountGetMaxLimit()

const {
  execute: executeExpenseAccountApproveAddress,
  isLoading: isLoadingApproveAddress,
  isSuccess: isSuccessApproveAddress
} = useExpenseAccountApproveAddress()

const {
  execute: executeExpenseAccountDisapproveAddress,
  isLoading: isLoadingDisapproveAddress,
  isSuccess: isSuccessDisapproveAddress
} = useExpenseAccountDisapproveAddress()

const {
  execute: executeExpenseAccountSetLimit,
  isLoading: isLoadingSetLimit,
  isSuccess: isSuccessMaxLimit
} = useExpenseAccountSetLimit()

const {
  execute: executeExpenseAccountTransfer
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
  execute: executeExpenseAccountGetOwner
} = useExpenseAccountGetOwner()

const {
  data: contractBalance,
  execute: executeExpenseAccountGetBalance,
  isLoading: isLoadingBalance
} = useExpenseAccountGetBalance()

const {
  data: isApprovedAddress,
  execute: executeExpenseAccountIsApprovedAddress
} = useExpenseAccountIsApprovedAddress()

const deployExpenseAccount = async () => {
  await executeDeployExpenseAccount()
  await getExpenseAccountOwner()
  await getExpenseAccountBalance()
  //API call here
  console.log("contractAddress: ", contractAddress.value)
}

const getExpenseAccountBalance = async () => {
  await executeExpenseAccountGetBalance(EXPENSE_ACCOUNT_ADDRESS)
}

const getExpenseAccountOwner = async () => {
  await executeExpenseAccountGetOwner(EXPENSE_ACCOUNT_ADDRESS)
}

const transferFromExpenseAccount = async (to: string, amount: string) => {
  await executeExpenseAccountTransfer(
    EXPENSE_ACCOUNT_ADDRESS, 
    to,
    amount
  )
  await executeExpenseAccountGetBalance(EXPENSE_ACCOUNT_ADDRESS)
}

const setExepenseAccountLimit = async (amount: any) => {
  await executeExpenseAccountSetLimit(
    EXPENSE_ACCOUNT_ADDRESS,
    amount.value
  )
  await getExpenseAccountMaxLimit()
}

const approveAddress = async (address: string) => {
  await executeExpenseAccountApproveAddress(
    EXPENSE_ACCOUNT_ADDRESS,
    address
  )

  await checkApprovedAddresses()
}

const disapproveAddress = async (address: string) => {
  await executeExpenseAccountDisapproveAddress(
    EXPENSE_ACCOUNT_ADDRESS,
    address
  )

  await checkApprovedAddresses() 
}

const checkApprovedAddresses = async () => {
  if (props.team.members)
    for (const member of props.team.members) {
      await executeExpenseAccountIsApprovedAddress(
        EXPENSE_ACCOUNT_ADDRESS,
        member.address
      )
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
  await executeExpenseAccountGetMaxLimit(EXPENSE_ACCOUNT_ADDRESS)
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
  }
}

watch(isSuccessMaxLimit, (newVal) => {
  if (newVal)
    addSuccessToast('Max Limit Successfully Set')
})

watch(isSuccessDeploy, (newVal) => {
  if (newVal)
    addSuccessToast('Expense Account Successfully Created')
})

watch(errorDeploy, (newVal) => {
  if (errorDeploy)
    addErrorToast('Error Deploying Creating Account')
})
onMounted(async () => {
  await getExpenseAccountBalance()
  await getExpenseAccountMaxLimit()
  await getExpenseAccountOwner()
  await checkApprovedAddresses()
})
</script>