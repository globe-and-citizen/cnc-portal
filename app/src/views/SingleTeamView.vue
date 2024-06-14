<template>
  <div class="flex min-h-screen justify-center">
    <span v-if="teamIsFetching" class="loading loading-spinner loading-lg"></span>
    <div v-else class="pt-10 flex flex-col gap-5 w-10/12">
      <div class="flex justify-between gap-5">
        <div
          class="collapse collapse-arrow border"
          :class="`${team.ownerAddress == useUserDataStore().address ? 'bg-green-100' : 'bg-blue-100'}`"
        >
          <input type="checkbox" />
          <div class="collapse-title text-xl font-medium">
            <div class="flex items-center justify-center">
              <h2 class="pl-5">{{ team.name }}</h2>
              <div
                class="badge badge-sm badge-primary flex items-center justify-center ml-2"
                v-if="team.ownerAddress == useUserDataStore().address"
              >
                Owner
              </div>
              <div class="badge badge-sm badge-secondary ml-2" v-else>Employee</div>
            </div>
          </div>
          <div class="collapse-content">
            <p class="pl-5">{{ team.description }}</p>
            <p class="pl-5" v-if="team.bankAddress">
              Bank Contract Address: {{ team.bankAddress }}
            </p>
            <p class="pl-5" v-if="team.bankAddress && !balanceLoading">
              Team Balance: {{ teamBalance }} {{ NETWORK.currencySymbol }}
            </p>
            <p class="pl-5 flex flex-row gap-2" v-if="balanceLoading">
              <span>Team Balance: </span>
              <SkeletonLoading class="w-40 h-4 self-center" />
            </p>

            <div class="pl-5 flex flex-row justify-center gap-2 mt-5 items-center">
              <button
                class="btn btn-secondary btn-sm"
                v-if="team.ownerAddress == useUserDataStore().address"
                @click="updateTeamModalOpen"
              >
                Update
              </button>
              <button
                class="btn btn-error btn-sm"
                v-if="team.ownerAddress == useUserDataStore().address"
                @click="showDeleteConfirmModal = !showDeleteConfirmModal"
              >
                Delete
              </button>
            </div>
          </div>
        </div>

        <DeleteConfirmModal
          :showDeleteConfirmModal="showDeleteConfirmModal"
          :isLoading="teamIsDeleting"
          @toggleDeleteConfirmModal="showDeleteConfirmModal = !showDeleteConfirmModal"
          @deleteItem="deleteTeam()"
        >
          Are you sure you want to delete the team
          <span class="font-bold">{{ team.name }}</span
          >?
        </DeleteConfirmModal>
      </div>
      <div class="flex justify-end">
        <button
          class="btn btn-primary btn-disabled"
          @click="bankModal = true"
          v-if="!team.bankAddress"
        >
          Create Bank Account Smart Contract
        </button>
        <div class="flex gap-2">
          <button class="btn btn-primary" @click="depositModal = true" v-if="team.bankAddress">
            Deposit
          </button>
          <button class="btn btn-primary" @click="transferModal = true" v-if="team.bankAddress">
            Transfer
          </button>
        </div>
      </div>
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
      <!-- <TipsAction :addresses="team.members.map((member) => member.address)" /> -->
    </div>

    <dialog
      id="my_modal_4"
      class="modal modal-bottom sm:modal-middle"
      :class="{ 'modal-open': showModal }"
    >
      <div class="modal-box">
        <button
          class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
          @click="showModal = !showModal"
        >
          ✕
        </button>
        <h1 class="font-bold text-2xl">Update Team Details</h1>
        <hr class="" />
        <div class="flex flex-col gap-5">
          <label class="input input-bordered flex items-center gap-2 input-md mt-4">
            <span class="w-28">Team Name</span>
            <input type="text" class="grow" placeholder="Enter Team name" v-model="cname" />
          </label>
          <label class="input input-bordered flex items-center gap-2 input-md">
            <span class="w-28">Description</span>
            <input type="text" class="grow" placeholder="Enter short description" v-model="cdesc" />
          </label>
          <label class="input input-bordered flex items-center gap-2 input-md">
            <span class="w-30">Bank Smart Contract Address</span>
            <input
              type="text"
              class="grow"
              placeholder="Enter bank smart contract address"
              v-model="bankSmartContractAddress"
            />
          </label>
        </div>

        <div class="modal-action justify-center">
          <!-- if there is a button in form, it will close the modal -->
          <LoadingButton color="primary min-w-24" v-if="teamIsUpdating" />
          <button v-else class="btn btn-primary" @click="updateTeam">Submit</button>

          <!-- <button class="btn" @click="showModal = !showModal">Close</button> -->
        </div>
      </div>
    </dialog>
    <CreateBankModal
      v-if="bankModal"
      @close-modal="() => (bankModal = false)"
      @create-bank="async () => deployBankContract()"
      :loading="createBankLoading"
    />
    <DepositBankModal
      v-if="depositModal"
      @close-modal="() => (depositModal = false)"
      @deposit="async (amount: string) => depositToBank(amount)"
      :loading="depositLoading"
    />
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
import CreateBankModal from '@/components/modals/CreateBankModal.vue'
import DepositBankModal from '@/components/modals/DepositBankModal.vue'
import TransferFromBankModal from '@/components/modals/TransferFromBankModal.vue'

import { ToastType, type Member, type User, type Team } from '@/types'

import { isAddress } from 'ethers' // ethers v6
import { useToastStore } from '@/stores/useToastStore'
import { usePushTip, useSendTip } from '@/composables/tips'

import { useErrorHandler } from '@/composables/errorHandler'
import { useDeleteMember, useAddMember } from '@/composables/crud/teamMember'
import {
  useBankBalance,
  useBankDeposit,
  useDeployBankContract,
  useBankTransfer
} from '@/composables/bank'
import SkeletonLoading from '@/components/SkeletonLoading.vue'
import { NETWORK } from '@/constant'
import { useUserDataStore } from '@/stores/user'
import DeleteConfirmModal from '@/components/modals/DeleteConfirmModal.vue'
import { useUpdateTeam, useDeleteTeam, useGetTeam } from '@/composables/crud/team'
import LoadingButton from '@/components/LoadingButton.vue'
import { useSearchUser } from '@/composables/crud/user'

const showDeleteConfirmModal = ref(false)

const { addToast } = useToastStore()

const foundUsers = ref<User[]>([])
const filteredMembers = ref<User[]>([])

const route = useRoute()
const router = useRouter()
const isLoading = ref(false)
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
    addToast({
      message: pushTipError.value.reason ? pushTipError.value.reason : 'Failed to push tip',
      type: ToastType.Error,
      timeout: 5000
    })
  }
})
watch(sendTipError, () => {
  if (sendTipError.value) {
    addToast({
      message: sendTipError.value.reason ? sendTipError.value.reason : 'Failed to send tip',
      type: ToastType.Error,
      timeout: 5000
    })
  }
})
watch(pushTipSuccess, () => {
  if (pushTipSuccess.value) {
    addToast({ type: ToastType.Success, message: 'Tips pushed successfully', timeout: 5000 })
  }
})
watch(sendTipSuccess, async () => {
  if (sendTipSuccess.value) {
    addToast({ type: ToastType.Success, message: 'Tips sent successfully', timeout: 5000 })
  }
})
watch(balanceError, () => {
  if (balanceError.value) {
    addToast({ type: ToastType.Error, message: 'Failed to fetch team balance', timeout: 5000 })
  }
})
watch(createBankError, () => {
  if (createBankError.value) {
    addToast({
      type: ToastType.Error,
      message: 'Failed to create bank contract',
      timeout: 5000
    })
  }
})
watch(createBankSuccess, () => {
  if (createBankSuccess.value) {
    addToast({
      type: ToastType.Success,
      message: 'Bank contract created successfully',
      timeout: 5000
    })
  }
})
watch(depositSuccess, () => {
  if (depositSuccess.value) {
    addToast({ type: ToastType.Success, message: 'Deposited successfully', timeout: 5000 })
  }
})
watch(depositError, () => {
  if (depositError.value) {
    addToast({ type: ToastType.Error, message: 'Failed to deposit', timeout: 5000 })
  }
})
watch(transferSuccess, () => {
  if (transferSuccess.value) {
    addToast({ type: ToastType.Success, message: 'Transferred successfully', timeout: 5000 })
  }
})
watch(transferError, () => {
  if (transferError.value) {
    addToast({ type: ToastType.Error, message: 'Failed to transfer', timeout: 5000 })
  }
})

const cname = ref('')
const cdesc = ref('')
const bankSmartContractAddress = ref<string | null>('')

const showModal = ref(false)
const bankModal = ref(false)
const depositModal = ref(false)
const transferModal = ref(false)

const showAddMemberForm = ref(false)

const inputs = ref<Member[]>([])
let team = ref<Team>({
  id: '',
  name: '',
  description: '',
  bankAddress: null,
  members: [],
  ownerAddress: ''
})

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
  isSuccess: addMembersSuccess,
  error: addMembersError,
  data: teamMembersData,
  addingMembers: addMembersLoading
} = useAddMember()
watch(addMembersError, () => {
  if (addMembersError.value) {
    useErrorHandler().handleError(new Error(addMembersError.value))
  }
})
watch(addMembersSuccess, async () => {
  if (addMembersSuccess.value) {
    addToast({ type: ToastType.Success, message: 'Members added successfully', timeout: 5000 })
    const teamData = await getTeamAPI(String(route.params.id))
    if (teamData.value) {
      team.value = teamData.value.team
    }
    showAddMemberForm.value = false
    addMembersSuccess.value = false
  }
})
const handleAddMembers = async () => {
  const members = teamMembers.value.map((member) => {
    return {
      name: member.name,
      address: member.address
    }
  })
  await executeAddMembers(String(route.params.id), members)
}
const {
  data: teamData,
  error: getTeamError,
  isSuccess: getTeamSuccess,
  teamIsFetching,
  execute: getTeamAPI
} = useGetTeam()
watch(teamIsFetching, () => {
  if (teamIsFetching.value) {
    isLoading.value = true
  } else {
    isLoading.value = false
  }
})
watch(getTeamError, () => {
  if (getTeamError.value) {
    useErrorHandler().handleError(new Error(getTeamError.value))
  }
})
watch(getTeamSuccess, () => {
  if (getTeamSuccess.value) {
    team.value = teamData.value.team
    getTeamSuccess.value = false
  }
})
onMounted(async () => {
  const id = route.params.id
  try {
    const teamData = await getTeamAPI(String(id))
    if (teamData.value) {
      team.value = teamData.value.team
      cname.value = team.value.name
      cdesc.value = team.value.description
      bankSmartContractAddress.value = team.value.bankAddress
    } else {
      useErrorHandler().handleError(new Error('Failed to fetch team'))
    }
    if (team.value.bankAddress) {
      await getBalance(team.value.bankAddress)
    }
  } catch (error) {
    return useErrorHandler().handleError(error)
  }
})
const updateTeamModalOpen = async () => {
  showModal.value = true
  inputs.value = team.value.members
}

const {
  error: deleteMemberError,
  isSuccess: deleteMemberSuccess,
  memberIsDeleting,
  execute: deleteMemberAPI
} = useDeleteMember()
watch(deleteMemberError, () => {
  if (deleteMemberError.value) {
    useErrorHandler().handleError(new Error(deleteMemberError.value))
    showDeleteConfirmModal.value = false
  }
})
watch(deleteMemberSuccess, async () => {
  if (deleteMemberSuccess.value) {
    addToast({ type: ToastType.Success, message: 'Member deleted successfully', timeout: 5000 })
    deleteMemberSuccess.value = false
    const teamData = await getTeamAPI(String(route.params.id))
    if (teamData.value) {
      team.value = teamData.value.team
    }
  }
})

const deleteMember = async (id: string, address: string) => {
  await deleteMemberAPI(id, address)
}

const {
  execute: updateTeamAPI,
  teamIsUpdating,
  error: updateTeamError,
  isSuccess: updateTeamSuccess
} = useUpdateTeam()
watch(updateTeamError, () => {
  if (updateTeamError.value) {
    useErrorHandler().handleError(new Error(updateTeamError.value))
  }
})
watch(updateTeamSuccess, () => {
  if (updateTeamSuccess.value) {
    addToast({ type: ToastType.Success, message: 'Team updated successfully', timeout: 5000 })
    team.value.name = cname.value
    team.value.description = cdesc.value
    team.value.bankAddress = bankSmartContractAddress.value
    showModal.value = false
    updateTeamSuccess.value = false
  }
})
const updateTeam = async () => {
  const id = route.params.id
  await updateTeamAPI(String(id), {
    name: cname.value,
    description: cdesc.value,
    bankAddress: bankSmartContractAddress.value
  })
}
const {
  execute: deleteTeamAPI,
  teamIsDeleting,
  error: deleteTeamError,
  isSuccess: deleteTeamSuccess
} = useDeleteTeam()

watch(deleteTeamError, () => {
  if (deleteTeamError.value) {
    useErrorHandler().handleError(new Error(deleteTeamError.value))
  }
})
watch(deleteTeamSuccess, () => {
  if (deleteTeamSuccess.value) {
    addToast({ type: ToastType.Success, message: 'Team deleted successfully', timeout: 5000 })
    deleteTeamSuccess.value = false
    showDeleteConfirmModal.value = !showDeleteConfirmModal.value
    router.push('/teams')
  }
})
const deleteTeam = async () => {
  await deleteTeamAPI(String(route.params.id))
}
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
const searchUsers = async (input: { name: string; address: string }) => {
  try {
    const users = await useSearchUser().execute(input.name, input.address)
    // const users = await userApi.searchUser(input.name, input.address)
    foundUsers.value = users
    console.log(users)
  } catch (error) {
    foundUsers.value = []
    return useErrorHandler().handleError(error)
  }
}
const searchMembers = async (query: string) => {
  try {
    const result = await getTeamAPI(String(route.params.id), query)
    filteredMembers.value = result?.members || []
  } catch (error) {
    filteredMembers.value = []
    return useErrorHandler().handleError(error)
  }
}
const membersAddress = computed(() => {
  return team.value.members.map((member) => member.address)
})
</script>
