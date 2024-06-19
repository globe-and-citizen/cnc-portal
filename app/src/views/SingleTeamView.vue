<template>
  <div class="flex min-h-screen justify-center">
    <span v-if="teamIsFetching" class="loading loading-spinner loading-lg"></span>

    <div v-if="!teamIsFetching && team" class="pt-10 flex flex-col gap-5 w-10/12">
      <div class="flex justify-between gap-5">
        <TeamDetails
          :team="team"
          :balanceLoading="balanceLoading"
          :teamBalance="Number(teamBalance)"
          @updateTeamModalOpen="updateTeamModalOpen"
          @deleteTeam="showDeleteConfirmModal = !showDeleteConfirmModal"
        />

        <DeleteConfirmModal
          :showDeleteConfirmModal="showDeleteConfirmModal"
          :isLoading="teamIsDeleting"
          @toggleDeleteConfirmModal="showDeleteConfirmModal = !showDeleteConfirmModal"
          @deleteItem="async () => deleteTeamAPI()"
        >
          Are you sure you want to delete the team
          <span class="font-bold">{{ team.name }}</span
          >?
        </DeleteConfirmModal>
      </div>
      <TeamActions
        :team="team"
        @createContract="bankModal = true"
        @deposit="depositModal = true"
        @transfer="transferModal = true"
      />
      <div
        class="bg-base-100 flex h-16 items-center rounded-xl text-sm font-bold justify-between px-4"
      >
        <span class="w-1/2">Name</span>
        <span class="w-1/2">Address</span>
        <AddMemberCard
          :isLoading="addMembersLoading"
          class="w-1/2"
          :users="foundUsers"
          v-if="team.ownerAddress == useUserDataStore().address"
          v-model:formData="teamMembers"
          v-model:showAddMemberForm="showAddMemberForm"
          @searchUsers="(input) => searchUsers(input)"
          @addInput="addInput"
          @removeInput="removeInput"
          @addMembers="handleAddMembers"
          @updateForm="handleUpdateForm"
          @toggleAddMemberModal="showAddMemberForm = !showAddMemberForm"
        />
      </div>
      <MemberCard
        v-for="member in team.members"
        :ownerAddress="team.ownerAddress"
        :teamId="Number(team.id)"
        :member="member"
        :isMemberDeleting="memberIsDeleting"
        :key="member.address"
        @deleteMember="(id, address) => deleteMember(id, address)"
      />
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-20"></div>
      <TipsAction
        :pushTipLoading="pushTipLoading"
        :sendTipLoading="sendTipLoading"
        @pushTip="(amount) => pushTip(membersAddress, amount, team.bankAddress)"
        @sendTip="(amount) => sendTip(membersAddress, amount, team.bankAddress)"
      />
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
        @close-modal="() => (bankModal = false)"
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
    <TransferFromBankModal
      v-if="transferModal"
      @close-modal="() => (transferModal = false)"
      @transfer="async (to: string, amount: string) => transferFromBank(to, amount)"
      @searchMembers="async (query: string) => await searchMembers(query)"
      :filteredMembers="filteredMembers"
      :loading="transferLoading"
      :bank-balance="teamBalance"
    />
  </div>
</template>
<script setup lang="ts">
import MemberCard from '@/components/MemberCard.vue'
import { onMounted, ref, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AddMemberCard from '@/components/AddMemberCard.vue'
import TipsAction from '@/components/TipsAction.vue'
import CreateBankForm from '@/components/modals/CreateBankForm.vue'
import DepositBankForm from '@/components/modals/DepositBankForm.vue'
import TransferFromBankModal from '@/components/modals/TransferFromBankModal.vue'
import UpdateTeamForm from '@/components/modals/UpdateTeamForm.vue'
import { type Member, type Team, type User } from '@/types'

import { isAddress } from 'ethers' // ethers v6
import { useToastStore } from '@/stores/useToastStore'
import { usePushTip, useSendTip } from '@/composables/tips'

import { useErrorHandler } from '@/composables/errorHandler'
import {
  useBankBalance,
  useBankDeposit,
  useDeployBankContract,
  useBankTransfer
} from '@/composables/bank'
import TeamDetails from '@/components/TeamDetails.vue'
import TeamActions from '@/components/TeamActions.vue'
import { useUserDataStore } from '@/stores/user'
import DeleteConfirmModal from '@/components/modals/DeleteConfirmModal.vue'
import { useCustomFetch } from '@/composables/useCustomFetch'
import { AuthService } from '@/services/authService'
import ModalComponent from '@/components/ModalComponent.vue'

const showDeleteConfirmModal = ref(false)

const { addSuccessToast, addErrorToast } = useToastStore()

const foundUsers = ref<User[]>([])
const filteredMembers = ref<User[]>([])

const route = useRoute()
const router = useRouter()
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
const showModal = ref(false)
const bankModal = ref(false)
const depositModal = ref(false)
const transferModal = ref(false)

const showAddMemberForm = ref(false)

const inputs = ref<Member[]>([])

const teamMembers = ref([
  {
    name: '',
    address: '',
    isValid: false
  }
])

const addInput = () => {
  teamMembers.value.push({ name: '', address: '', isValid: false })
}

const removeInput = () => {
  if (teamMembers.value.length > 1) {
    teamMembers.value.pop()
  }
}

const handleUpdateForm = async () => {
  teamMembers.value.map((member) => {
    if (!isAddress(member.address)) {
      member.isValid = false
    } else {
      member.isValid = true
    }
  })
}

const {
  execute: executeAddMembers,
  error: addMembersError,
  isFetching: addMembersLoading
} = useCustomFetch(`teams/${String(route.params.id)}/member`, {
  immediate: false
})
  .post({ data: teamMembers.value })
  .json()
watch(addMembersError, () => {
  if (addMembersError.value) {
    useErrorHandler().handleError(new Error(addMembersError.value))
  }
})
watch([() => addMembersLoading.value, () => addMembersError.value], async () => {
  if (!addMembersLoading.value && !addMembersError.value) {
    addSuccessToast('Members added successfully')
    await getTeamAPI()
    showAddMemberForm.value = false
  }
})

const handleAddMembers = async () => {
  await executeAddMembers()
}
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
  await getTeamAPI()
})
const updateTeamModalOpen = async () => {
  showModal.value = true
  inputs.value = team.value.members
}

const {
  error: deleteMemberError,
  isFetching: memberIsDeleting,
  execute: deleteMemberAPI
} = useCustomFetch(`teams/${String(route.params.id)}/member`, {
  immediate: false,
  beforeFetch: async ({ options, url, cancel }) => {
    options.headers = {
      memberaddress: deleteMemberAddress.value,
      'Content-Type': 'application/json',
      Authorization: `Bearer ${AuthService.getToken()}`
    }
    return { options, url, cancel }
  }
})
  .delete()
  .json()
watch([() => memberIsDeleting.value, () => deleteMemberError.value], async () => {
  if (!memberIsDeleting.value && !deleteMemberError.value) {
    addSuccessToast('Member deleted successfully')
    getTeamAPI()
  }
})

watch(deleteMemberError, () => {
  if (deleteMemberError.value) {
    useErrorHandler().handleError(new Error(deleteMemberError.value))
    showDeleteConfirmModal.value = false
  }
})
const deleteMemberId = ref('')
const deleteMemberAddress = ref('')
const deleteMember = async (id: string, address: string) => {
  deleteMemberId.value = id
  deleteMemberAddress.value = address
  await deleteMemberAPI()
}
const updateTeamInput = ref<Partial<Team>>({
  name: '',
  description: '',
  bankAddress: ''
})
const {
  execute: updateTeamAPI,
  isFetching: teamIsUpdating,
  error: updateTeamError
} = useCustomFetch(`teams/${String(route.params.id)}`, {
  immediate: false
})
  .json()
  .put(updateTeamInput)
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
const {
  execute: deleteTeamAPI,
  isFetching: teamIsDeleting,
  error: deleteTeamError
} = useCustomFetch(`teams/${String(route.params.id)}`, {
  immediate: false
})
  .delete()
  .json()

watch(deleteTeamError, () => {
  if (deleteTeamError.value) {
    useErrorHandler().handleError(new Error(deleteTeamError.value))
  }
})
watch([() => teamIsDeleting.value, () => deleteTeamError.value], async () => {
  if (!teamIsDeleting.value && !deleteTeamError.value) {
    addSuccessToast('Team deleted successfully')
    showDeleteConfirmModal.value = !showDeleteConfirmModal.value
    router.push('/teams')
  }
})
const deployBankContract = async () => {
  const id = route.params.id
  await createBankContract(String(id))
  team.value.bankAddress = contractAddress.value
  if (team.value.bankAddress) {
    bankModal.value = false
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
const searchUserName = ref('')
const searchUserAddress = ref('')
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
const query = ref('')
const searchMembers = async (queryIn: string) => {
  try {
    query.value = queryIn
    const result = await getTeamAPI()
    filteredMembers.value = result?.members || []
  } catch (error) {
    filteredMembers.value = []
    return useErrorHandler().handleError(error)
  }
}
const membersAddress = computed(() => {
  return team.value.members.map((member: { address: string }) => member.address)
})
</script>
