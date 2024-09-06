<template>
  <!-- Expense Account Created -->
  <div v-if="ownerAddress">
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
      <span
        class="loading loading-dots loading-xs"
        data-test="balance-loading"
        v-if="isLoadingBalance"
      ></span>
      <div class="stat-value text-3xl mt-2" v-else>
        {{ contractBalance }} <span class="text-xs">{{ NETWORK.currencySymbol }}</span>
      </div>
      <div class="stat-actions flex justify-center gap-2 items-center">
        <button
          class="btn btn-xs btn-secondary"
          v-if="team.bankAddress && team.ownerAddress == useUserDataStore().address"
          @click="transferModal = !transferModal"
        >
          Transfer
        </button>
        <button
          class="btn btn-xs btn-secondary"
          v-if="team.bankAddress && team.ownerAddress == useUserDataStore().address"
          @click=""
        >
          Set Limit
        </button>
        <button
          class="btn btn-xs btn-secondary"
          v-if="team.bankAddress && team.ownerAddress == useUserDataStore().address"
          @click=""
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
    </div>

    <div></div>
  </div>

  <!-- Expense Account Not Yet Created -->
  <div class="flex justify-center items-center" v-else>
    <button
      class="btn btn-primary"
      @click="async () => await deployExpenseAccount()"
      data-test="createExpenseAccount"
    >
      Create Expense Account
    </button>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import type { Team, User } from "@/types";
import { 
  useDeployExpenseAccountContract, 
  useExpenseAccountGetOwner,
  useExpenseAccountGetBalance,
  useExpenseAccountIsApprovedAddress,
  useExpenseAccountTransfer 
} from "@/composables/useExpenseAccount";
import { EXPENSE_ACCOUNT_ADDRESS, NETWORK } from "@/constant";
import TransferFromBankForm from '@/components/forms/TransferFromBankForm.vue'
import ModalComponent from "@/components/ModalComponent.vue";
import { useClipboard } from '@vueuse/core'
import ToolTip from '@/components/ToolTip.vue'
import { ClipboardDocumentListIcon, ClipboardDocumentCheckIcon } from '@heroicons/vue/24/outline'
import { useUserDataStore } from '@/stores/user'
import { useCustomFetch } from '@/composables/useCustomFetch'

const props = defineProps<{team: Partial<Team>}>()
const approvedAddresses = ref<{[key: string]: boolean}>({})
const transferModal = ref(false)
const foundUsers = ref<User[]>([])
const searchUserName = ref('')
const searchUserAddress = ref('')

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
  execute: executeExpenseAccountTransfer
} = useExpenseAccountTransfer()

const {
  data: contractAddress,
  execute: executeDeployExpenseAccount,
  isLoading: isLoadingDeploy
} = useDeployExpenseAccountContract()

const {
  data: ownerAddress,
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
  console.log("expenseAccountBalance: ", contractBalance.value)
}

const getExpenseAccountOwner = async () => {
  await executeExpenseAccountGetOwner(EXPENSE_ACCOUNT_ADDRESS)
  console.log("expenseAccountOwner: ", ownerAddress.value)
}

const transferFromExpenseAccount = async (to: string, amount: string) => {
  console.log('to: ', to, ', amount: ', amount)
  await executeExpenseAccountTransfer(
    EXPENSE_ACCOUNT_ADDRESS, 
    to,
    amount
  )
  await executeExpenseAccountGetBalance(EXPENSE_ACCOUNT_ADDRESS)
}

const checkApprovedAddresses = async () => {
  if (props.team.members)
    for (const member of props.team.members) {
      await executeExpenseAccountIsApprovedAddress(
        EXPENSE_ACCOUNT_ADDRESS,
        member.address
      )
      console.log(`${member.address}`, isApprovedAddress.value)
      if (isApprovedAddress.value)
        approvedAddresses.value[member.address] = isApprovedAddress.value
    }
    console.log("approvedAddressed: ", approvedAddresses.value)
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
onMounted(async () => {
  await getExpenseAccountBalance()
  await getExpenseAccountOwner()
  await checkApprovedAddresses()
})
</script>