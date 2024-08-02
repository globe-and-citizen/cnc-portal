<template>
  <div class="flex min-h-screen justify-center">
    <span v-if="teamIsFetching || balanceLoading" class="loading loading-spinner loading-lg"></span>

    <div
      v-if="!(teamIsFetching || balanceLoading) && team"
      class="pt-10 flex flex-col gap-5 w-full items-center"
    >
      <div class="flex justify-between gap-5 w-full">
        <TeamDetails
          :team="team"
          :balanceLoading="balanceLoading"
          :teamBalance="Number(teamBalance)"
          @updateTeamModalOpen="updateTeamModalOpen"
          @deleteTeam="showDeleteTeamConfirmModal = true"
        />
        <ModalComponent v-model="showDeleteTeamConfirmModal">
          <DeleteConfirmForm :isLoading="teamIsDeleting" @deleteItem="async () => deleteTeamAPI()">
            Are you sure you want to delete the team
            <span class="font-bold">{{ team.name }}</span
            >?
          </DeleteConfirmForm>
        </ModalComponent>
      </div>
      <button
        class="btn btn-primary btn-xs"
        @click="bankModal = true"
        v-if="!team.bankAddress && team.ownerAddress == useUserDataStore().address"
        data-test="createBank"
      >
        Create Bank Account
      </button>
      <TabNavigation v-model="activeTab" :tabs="tabs" class="w-full">
        <template #tab-0>
          <div id="members" v-if="activeTab == 0">
            <div
              class="bg-base-100 flex h-16 items-center rounded-xl text-sm font-bold justify-between px-4 w-full"
            >
              <span class="w-1/2">Name</span>
              <span class="w-1/2">Address</span>
              <AddMemberCard
                class="w-1/2"
                v-if="team.ownerAddress == useUserDataStore().address"
                @toggleAddMemberModal="showAddMemberForm = !showAddMemberForm"
              />
              <ModalComponent v-model="showAddMemberForm">
                <AddMemberForm
                  :isLoading="addMembersLoading"
                  :users="foundUsers"
                  :formData="teamMembers"
                  @searchUsers="(input) => searchUsers(input)"
                  @addMembers="handleAddMembers"
                />
              </ModalComponent>
            </div>
            <MemberCard
              v-for="member in team.members"
              :ownerAddress="team.ownerAddress"
              :teamId="Number(team.id)"
              :member="member"
              :isMemberDeleting="memberIsDeleting"
              :key="member.address"
              @deleteMember="
                (member) => {
                  memberToBeDeleted.name = member.name
                  memberToBeDeleted.id = member.id
                  memberToBeDeleted.address = member.address
                  showDeleteMemberConfirmModal = true
                }
              "
            />
          </div>
        </template>
        <template #tab-1>
          <TeamAccount
            v-if="activeTab == 1"
            :teamBalance="Number(teamBalance)"
            :team="team"
            @createBank="bankModal = true"
            @deposit="depositModal = true"
            @transfer="transferModal = true"
            :pushTipLoading="pushTipLoading"
            :sendTipLoading="sendTipLoading"
            :balanceLoading="balanceLoading"
            @pushTip="(amount: Number) => pushTip(membersAddress, amount, team.bankAddress)"
            @sendTip="(amount: Number) => sendTip(membersAddress, amount, team.bankAddress)"
          />
        </template>
        <template #tab-2>
          <BankTransactions v-if="activeTab == 2" :bank-address="team.bankAddress" />
        </template>
        <template #tab-3>
          <ProposalDashBoard :team="team" @getTeam="getTeamAPI" />
        </template>
      </TabNavigation>
      <ModalComponent v-model="showDeleteMemberConfirmModal">
        <DeleteConfirmForm :isLoading="memberIsDeleting" @deleteItem="deleteMemberAPI">
          Are you sure you want to delete
          <span class="font-bold">{{ memberToBeDeleted.name }}</span>
          with address <span class="font-bold">{{ memberToBeDeleted.address }}</span>
          from the team?
        </DeleteConfirmForm>
      </ModalComponent>
    </div>

    <ModalComponent v-model="showModal">
      <UpdateTeamForm
        :teamIsUpdating="teamIsUpdating"
        v-model="updateTeamInput"
        @updateTeam="() => updateTeamAPI()"
      />
    </ModalComponent>
    <ModalComponent v-model="bankModal">
      <CreateBankForm
        @create-bank="async () => deployBankContract()"
        :loading="createBankLoading"
      />
    </ModalComponent>

    <ModalComponent v-model="depositModal">
      <DepositBankForm
        v-if="depositModal"
        @close-modal="() => (depositModal = false)"
        @deposit="async (amount: string) => depositToBank(amount)"
        :loading="depositLoading"
      />
    </ModalComponent>
    <ModalComponent v-model="transferModal">
      <TransferFromBankForm
        v-if="transferModal"
        @close-modal="() => (transferModal = false)"
        @transfer="async (to: string, amount: string) => transferFromBank(to, amount)"
        @searchMembers="(input) => searchUsers({ address: input, name: '' })"
        :filteredMembers="foundUsers"
        :loading="transferLoading"
        :bank-balance="teamBalance"
      />
    </ModalComponent>
  </div>
</template>
<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

// Store imports
import { useToastStore } from '@/stores/useToastStore'
import { useUserDataStore } from '@/stores/user'

// Composables
import { useErrorHandler } from '@/composables/errorHandler'
import { useCustomFetch } from '@/composables/useCustomFetch'
import { usePushTip, useSendTip } from '@/composables/tips'
import {
  useBankBalance,
  useBankDeposit,
  useDeployBankContract,
  useBankTransfer
} from '@/composables/bank'

// Service
// import { AuthService } from '@/services/authService'

// Modals/Forms
import CreateBankForm from '@/components/forms/CreateBankForm.vue'
import DepositBankForm from '@/components/forms/DepositBankForm.vue'
import TransferFromBankForm from '@/components/forms/TransferFromBankForm.vue'
import UpdateTeamForm from '@/components/sections/SingleTeamView/Team/forms/UpdateTeamForm.vue'
import AddMemberForm from '@/components/sections/SingleTeamView/Team/forms/AddMemberForm.vue'
import DeleteConfirmForm from '@/components/forms/DeleteConfirmForm.vue'

//Components
import MemberCard from '@/components/sections/SingleTeamView/Team/MemberCard.vue'
import AddMemberCard from '@/components/AddMemberCard.vue'
import TeamDetails from '@/components/sections/SingleTeamView/Team/TeamDetails.vue'
import ModalComponent from '@/components/ModalComponent.vue'
import TabNavigation from '@/components/TabNavigation.vue'
import BankTransactions from '@/components/BankTransactions.vue'
import TeamAccount from '@/components/sections/SingleTeamView/Team/TeamAccount.vue'
import ProposalDashBoard from '@/components/sections/SingleTeamView/Governance/ProposalDashboard.vue'

import { type Member, type Team, type User, SingleTeamTabs } from '@/types'

// Modal control states
const showDeleteMemberConfirmModal = ref(false)
const showDeleteTeamConfirmModal = ref(false)
const showModal = ref(false)
const bankModal = ref(false)
const depositModal = ref(false)
const transferModal = ref(false)
const showAddMemberForm = ref(false)
const tabs = ref<Array<SingleTeamTabs>>([SingleTeamTabs.Members])
const isOwner = ref(false)

// CRUD input refs
const foundUsers = ref<User[]>([])
const teamMembers = ref([{ name: '', address: '', isValid: false }])
const memberToBeDeleted = ref({ name: '', address: '', id: '' })
const searchUserName = ref('')
const searchUserAddress = ref('')
const inputs = ref<Member[]>([])
const updateTeamInput = ref<Partial<Team>>({
  name: '',
  description: '',
  bankAddress: ''
})
const activeTab = ref(0)

const route = useRoute()
const router = useRouter()

const { addSuccessToast, addErrorToast } = useToastStore()

// Banking composables
const {
  execute: pushTip,
  isLoading: pushTipLoading,
  isSuccess: pushTipSuccess,
  error: pushTipError
} = usePushTip()
const {
  execute: sendTip,
  isLoading: sendTipLoading,
  isSuccess: sendTipSuccess,
  error: sendTipError
} = useSendTip()
const {
  execute: getBalance,
  isLoading: balanceLoading,
  data: teamBalance,
  error: balanceError
} = useBankBalance()
const {
  contractAddress,
  execute: createBankContract,
  isLoading: createBankLoading,
  isSuccess: createBankSuccess,
  error: createBankError
} = useDeployBankContract()
const {
  execute: deposit,
  isLoading: depositLoading,
  isSuccess: depositSuccess,
  error: depositError
} = useBankDeposit()
const {
  execute: transfer,
  isLoading: transferLoading,
  isSuccess: transferSuccess,
  error: transferError
} = useBankTransfer()

// Watchers for Banking functions
watch(pushTipError, async () => {
  if (pushTipError.value) {
    addErrorToast(pushTipError.value.reason ? pushTipError.value.reason : 'Failed to push tip')
  }
})
watch(sendTipError, () => {
  if (sendTipError.value) {
    addErrorToast(sendTipError.value.reason ? sendTipError.value.reason : 'Failed to send tip')
  }
})
watch(pushTipSuccess, () => {
  if (pushTipSuccess.value) {
    addSuccessToast('Tips pushed successfully')
  }
})
watch(sendTipSuccess, async () => {
  if (sendTipSuccess.value) {
    addSuccessToast('Tips sent successfully')
  }
})
watch(balanceError, () => {
  if (balanceError.value) {
    addErrorToast('Failed to fetch team balance')
  }
})
watch(createBankError, () => {
  if (createBankError.value) {
    addErrorToast('Failed to create bank contract')
  }
})
watch(createBankSuccess, async () => {
  if (createBankSuccess.value) {
    addSuccessToast('Bank contract created successfully')
    bankModal.value = false
    await getTeamAPI()
  }
})
watch(depositSuccess, () => {
  if (depositSuccess.value) {
    addSuccessToast('Deposited successfully')
  }
})
watch(depositError, () => {
  if (depositError.value) {
    addErrorToast('Failed to deposit')
  }
})
watch(transferSuccess, () => {
  if (transferSuccess.value) {
    addSuccessToast('Transferred successfully')
  }
})
watch(transferError, () => {
  if (transferError.value) {
    addErrorToast('Failed to transfer')
  }
})

// useFetch instance for getting team details
const {
  error: getTeamError,
  data: team,
  isFetching: teamIsFetching,
  execute: getTeamAPI
} = useCustomFetch(`teams/${String(route.params.id)}`, {
  immediate: false
})
  .get()
  .json()

// Watchers for getting team details
watch(getTeamError, () => {
  if (getTeamError.value) {
    useErrorHandler().handleError(new Error(getTeamError.value))
  }
})
watch([() => teamIsFetching.value, () => getTeamError.value, () => team.value], async () => {
  if (!teamIsFetching.value && !getTeamError.value && team.value) {
    updateTeamInput.value.name = team.value.name
    updateTeamInput.value.description = team.value.description
    updateTeamInput.value.bankAddress = team.value.bankAddress
  }
})
onMounted(async () => {
  await getTeamAPI() //Call the execute function to get team details on mount

  if (team.value.ownerAddress == useUserDataStore().address) {
    isOwner.value = true
  }
  if (team.value.bankAddress) {
    tabs.value.push(SingleTeamTabs.Bank, SingleTeamTabs.Transactions, SingleTeamTabs.Proposals)
    await getBalance(team.value.bankAddress)
  }
})

// useFetch instance for adding members to team
const {
  execute: executeAddMembers,
  error: addMembersError,
  isFetching: addMembersLoading
} = useCustomFetch(`teams/${String(route.params.id)}/member`, {
  immediate: false
})
  .post({ data: teamMembers.value })
  .json()
// Watchers for adding members to team
watch(addMembersError, () => {
  if (addMembersError.value) {
    useErrorHandler().handleError(new Error(addMembersError.value))
  }
})
watch([() => addMembersLoading.value, () => addMembersError.value], async () => {
  if (!addMembersLoading.value && !addMembersError.value) {
    addSuccessToast('Members added successfully')
    teamMembers.value = [{ name: '', address: '', isValid: false }]
    foundUsers.value = []
    await getTeamAPI()
    showAddMemberForm.value = false
  }
})

const handleAddMembers = async () => {
  await executeAddMembers()
}

// useFetch instance for updating team details
const {
  execute: updateTeamAPI,
  isFetching: teamIsUpdating,
  error: updateTeamError
} = useCustomFetch(`teams/${String(route.params.id)}`, {
  immediate: false
})
  .json()
  .put(updateTeamInput)
// Watchers for updating team details
watch(updateTeamError, () => {
  if (updateTeamError.value) {
    useErrorHandler().handleError(new Error(updateTeamError.value))
  }
})
watch([() => teamIsUpdating.value, () => updateTeamError.value], async () => {
  if (!teamIsUpdating.value && !updateTeamError.value) {
    addSuccessToast('Team updated successfully')
    showModal.value = false
    getTeamAPI()
  }
})

// useFetch instance for deleting team
const {
  execute: deleteTeamAPI,
  isFetching: teamIsDeleting,
  error: deleteTeamError
} = useCustomFetch(`teams/${String(route.params.id)}`, {
  immediate: false
})
  .delete()
  .json()
// Watchers for deleting team
watch(deleteTeamError, () => {
  if (deleteTeamError.value) {
    useErrorHandler().handleError(new Error(deleteTeamError.value))
  }
})
watch([() => teamIsDeleting.value, () => deleteTeamError.value], async () => {
  if (!teamIsDeleting.value && !deleteTeamError.value) {
    addSuccessToast('Team deleted successfully')
    showDeleteTeamConfirmModal.value = !showDeleteTeamConfirmModal.value
    router.push('/teams')
  }
})
const updateTeamModalOpen = async () => {
  showModal.value = true
  inputs.value = team.value.members
}

// useFetch instance for deleting member
const {
  error: deleteMemberError,
  isFetching: memberIsDeleting,
  execute: deleteMemberAPI
} = useCustomFetch(`teams/${String(route.params.id)}/member`, {
  immediate: false,
  beforeFetch: async ({ options, url, cancel }) => {
    options.headers = {
      memberaddress: memberToBeDeleted.value.address,
      'Content-Type': 'application/json'
      // Authorization: `Bearer ${AuthService.getToken()}`
    }
    return { options, url, cancel }
  }
})
  .delete()
  .json()
// Watchers for deleting member
watch([() => memberIsDeleting.value, () => deleteMemberError.value], async () => {
  if (!memberIsDeleting.value && !deleteMemberError.value) {
    addSuccessToast('Member deleted successfully')
    showDeleteMemberConfirmModal.value = false
    getTeamAPI()
  }
})

watch(deleteMemberError, () => {
  if (deleteMemberError.value) {
    useErrorHandler().handleError(new Error(deleteMemberError.value))
    showDeleteMemberConfirmModal.value = false
  }
})

const deployBankContract = async () => {
  const id = route.params.id
  await createBankContract(String(id))
  team.value.bankAddress = contractAddress.value
  if (team.value.bankAddress) {
    bankModal.value = false
    tabs.value.push(SingleTeamTabs.Bank, SingleTeamTabs.Transactions, SingleTeamTabs.Proposals)
    await getTeamAPI()
    await getBalance(team.value.bankAddress)
  }
}
const depositToBank = async (amount: string) => {
  await deposit(team.value.bankAddress, amount)
  if (depositSuccess.value) {
    depositModal.value = false
    await getBalance(team.value.bankAddress)
  }
}
const transferFromBank = async (to: string, amount: string) => {
  await transfer(team.value.bankAddress, to, amount)
  if (transferSuccess.value) {
    transferModal.value = false
    await getBalance(team.value.bankAddress)
  }
}

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
const searchUsers = async (input: { name: string; address: string }) => {
  try {
    searchUserName.value = input.name
    searchUserAddress.value = input.address
    if (searchUserName.value || searchUserAddress.value) {
      await executeSearchUser()
    }
  } catch (error) {
    return useErrorHandler().handleError(error)
  }
}
const membersAddress = computed(() => {
  return team.value.members.map((member: { address: string }) => member.address)
})
</script>
