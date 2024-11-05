<template>
  <div class="flex flex-col gap-y-4">
    <div
      v-if="team.expenseAccountAddress"
      class="stats bg-green-100 flex text-primary-content border-outline justify-center items-center p-5 overflow-visible"
    >
      <!-- Expense A/c Info Section -->
      <section class="stat flex flex-col justify-center items-center">
        <div class="stat-title text-center">Expense Account Address</div>

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

        <div class="flex items-center pt-3 mt-10" style="border-width: 0">
          <div>
            <div class="stat-title pr-3">Balance</div>
            <div v-if="false" class="stat-value mt-1 border-r border-gray-400 pr-3">
              <span class="loading loading-dots loading-xs" data-test="balance-loading"> </span>
            </div>
            <div
              v-else
              class="stat-value text-3xl mt-2 border-r border-gray-400 pr-3"
              data-test="contract-balance"
            >
              {{ `0.0` }} <span class="text-xs">{{ NETWORK.currencySymbol }}</span>
            </div>
          </div>

          <div class="pl-3">
            <div class="stat-title pr-3">Max Limit</div>
            <div v-if="false" class="stat-value mt-1 border-r border-gray-400 pr-3">
              <span class="loading loading-dots loading-xs" data-test="max-loading"> </span>
            </div>
            <div
              v-else
              class="stat-value text-3xl mt-2 border-r border-gray-400 pr-3"
              data-test="max-limit"
            >
              {{ `0.0` }} <span class="text-xs">{{ NETWORK.currencySymbol }}</span>
            </div>
          </div>

          <div class="pl-3">
            <div class="stat-title pr-3">Limit Balance</div>
            <div v-if="false" class="stat-value mt-1 pr-3">
              <span class="loading loading-dots loading-xs" data-test="limit-loading"> </span>
            </div>
            <div v-else class="stat-value text-3xl mt-2 pr-3" data-test="limit-balance">
              {{ `0.0` }} <span class="text-xs">{{ NETWORK.currencySymbol }}</span>
            </div>
          </div>
        </div>

        <div class="stat-title text-center mt-10">
          Approval Expiry:
          <span class="font-bold text-black">{{ new Date().toLocaleString('en-US') }}</span>
        </div>

        <div class="stat-actions flex justify-center gap-2 items-center mt-8">
          <button
            class="btn btn-secondary"
            :disabled="currentUserAddress !== contractOwnerAddress"
            v-if="true"
            @click="transferModal = true"
            data-test="transfer-button"
          >
            Transfer
          </button>
        </div>
        <ModalComponent v-model="transferModal">
          <TransferFromBankForm
            v-if="transferModal"
            @close-modal="() => (transferModal = false)"
            @transfer="async (to: string, amount: string) => {}"
            @searchMembers="(input) => searchUsers({ name: '', address: input })"
            :filteredMembers="foundUsers"
            :loading="false"
            :bank-balance="`${'0.0'}`"
            service="Expense Account"
          />
        </ModalComponent>
      </section>

      <!-- Approve User Form -->
      <section
        v-if="contractOwnerAddress === currentUserAddress || isBodAction()"
        class="stat flex flex-col justify-center items-center"
      >
        <div class="w-3/4">
          <ApproveUsersForm
            :form-data="teamMembers"
            :users="foundUsers"
            :loading-approve="loadingApprove"
            :is-bod-action="isBodAction()"
            @approve-user="approveUser"
            @close-modal="approveUsersModal = false"
            @search-users="(input) => searchUsers(input)"
          />
        </div>
      </section>
    </div>
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
import ApproveUsersForm from './forms/ApproveUsersEIP712Form.vue'
import { useClipboard } from '@vueuse/core'
import ToolTip from '@/components/ToolTip.vue'
import { ClipboardDocumentListIcon, ClipboardDocumentCheckIcon } from '@heroicons/vue/24/outline'
import { useUserDataStore, useToastStore } from '@/stores'
import { useCustomFetch } from '@/composables/useCustomFetch'
import { parseError, log } from '@/utils'
import { EthersJsAdapter } from '@/adapters/web3LibraryAdapter'
import { useReadContract } from '@wagmi/vue'
import expenseAccountABI from '@/artifacts/abi/expense-account.json'
import type { Address } from 'viem'

//#endregion imports

//#region variable declarations
const currentUserAddress = useUserDataStore().address
const props = defineProps<{ team: Partial<Team> }>()
const team = ref(props.team)
const transferModal = ref(false)
const approveUsersModal = ref(false)
const foundUsers = ref<User[]>([])
const searchUserName = ref('')
const searchUserAddress = ref('')
const teamMembers = ref([{ name: '', address: '', isValid: false }])
const loadingApprove = ref(false)

const { addErrorToast } = useToastStore()
const { copy, copied, isSupported } = useClipboard()
const web3Library = new EthersJsAdapter()
//#endregion variable declarations

//#region expense account composable
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

watch(searchUserResponse, () => {
  if (searchUserResponse.value?.ok && users.value?.users) {
    foundUsers.value = users.value.users
  }
})
//#region helper functions

const init = async () => {
  await getExpenseAccountOwner()
}

const getExpenseAccountOwner = async () => {
  if (team.value.expenseAccountAddress) await executeExpenseAccountGetOwner()
}

const approveUser = async (data: {}) => {
  loadingApprove.value = true
  const provider = await web3Library.getProvider()
  const signer = await web3Library.getSigner()
  const chainId = (await provider.getNetwork()).chainId
  const verifyingContract = team.value.expenseAccountAddress

  const domain = {
    name: 'CNCExpenseAccount',
    version: '1',
    chainId,
    verifyingContract
  }

  const types = {
    BudgetLimit: [
      { name: 'approvedAddress', type: 'address' },
      { name: 'budgetType', type: 'uint8' },
      { name: 'value', type: 'uint256' },
      { name: 'expiry', type: 'uint256' }
    ]
  }

  try {
    const signature = await signer.signTypedData(domain, types, data)
    console.log(`signature: `, signature)
  } catch (err) {
    log.error(parseError(err))
    addErrorToast(parseError(err))
  } finally {
    loadingApprove.value = false
  }
}

const isBodAction = () => {
  return false
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
watch(errorGetOwner, (newVal) => {
  if (newVal) addErrorToast(errorMessage(newVal, 'Error Getting Contract Owner'))
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
