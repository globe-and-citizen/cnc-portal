<template>
  <div class="pt-10 flex flex-col gap-5">
    <div class="flex justify-between gap-5">
      <div>
        <h2 class="pl-5">{{ team.name }}</h2>
        <p class="pl-5 pb-3 text-xl">{{ team.description }}</p>
        <p class="pl-5" v-if="team.bankAddress">Bank Contract Address: {{ team.bankAddress }}</p>
        <p class="pl-5" v-if="team.bankAddress && !balanceLoading">
          Team Balance: {{ teamBalance }} {{ NETWORK.currencySymbol }}
        </p>
        <p class="pl-5 flex flex-row gap-2" v-if="balanceLoading">
          <span>Team Balance: </span>
          <SkeletonLoading class="w-40 h-4 self-center" />
        </p>
      </div>
      <div class="flex flex-wrap justify-between gap-1 items-center">
        <button class="btn btn-primary" @click="bankModal = true" v-if="!team.bankAddress">
          Create Bank Account Smart Contract
        </button>
        <button class="btn btn-primary" @click="depositModal = true" v-if="team.bankAddress">
          Deposit
        </button>
        <button class="btn btn-primary" @click="transferModal = true" v-if="team.bankAddress">
          Transfer
        </button>
        <button class="btn btn-primary" @click="updateTeamModalOpen">Update</button>

        <button class="btn btn-primary" @click="deleteTeam">Delete Team</button>
      </div>
    </div>
    <div class="card w-full bg-base-100 overflow-x-auto p-4">
      <table class="table">
        <!-- head -->
        <thead>
          <tr>
            <th></th>
            <th>Name</th>
            <th>Address</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          <MemberCard
            v-for="member in team.members"
            :updateMemberInput="updateMemberInput"
            :member="member"
            :key="member.id"
            :showUpdateMemberModal="showUpdateMemberModal"
            @updateMember="(id) => updateMember(id)"
            @deleteMember="(id) => deleteMember(id)"
            @toggleUpdateMemberModal="toggleUpdateMemberModal"
          />
        </tbody>
      </table>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-20">
      <AddMemberCard
        v-model:formData="teamMembers"
        v-model:showAddMemberForm="showAddMemberForm"
        @addInput="addInput"
        @removeInput="removeInput"
        @addMembers="handleAddMembers"
        @updateForm="handleUpdateForm"
        @toggleAddMemberModal="showAddMemberForm = !showAddMemberForm"
      />
    </div>
    <TipsAction
      :pushTipLoading="pushTipLoading"
      :sendTipLoading="sendTipLoading"
      @pushTip="(amount) => pushTip(membersAddress, amount, team.bankAddress)"
      @sendTip="(amount) => sendTip(membersAddress, amount, team.bankAddress)"
    />
    <!-- <TipsAction :addresses="team.members.map((member) => member.walletAddress)" /> -->
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
      </div>

      <div class="modal-action justify-center">
        <!-- if there is a button in form, it will close the modal -->
        <button class="btn btn-primary" @click="updateTeam">Submit</button>

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
    :loading="transferLoading"
    :bank-balance="teamBalance"
  />
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

import { ToastType, type Member, type MemberInput, type Team } from '@/types'
import { FetchTeamAPI } from '@/apis/teamApi'
import { FetchMemberAPI } from '@/apis/memberApi'

import { isAddress } from 'ethers' // ethers v6
import { useToastStore } from '@/stores/toast'
import { usePushTip, useSendTip } from '@/composables/tips'

import { useErrorHandler } from '@/composables/errorHandler'
import {
  useBankBalance,
  useBankDeposit,
  useDeployBankContract,
  useBankTransfer
} from '@/composables/bank'
import SkeletonLoading from '@/components/SkeletonLoading.vue'
import { NETWORK } from '@/constant'

const { show } = useToastStore()
const memberApi = new FetchMemberAPI()
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
    await getBalance()
    show(
      ToastType.Error,
      pushTipError.value.reason ? pushTipError.value.reason : 'Failed to push tip'
    )
  }
})
watch(sendTipError, () => {
  if (sendTipError.value) {
    show(
      ToastType.Error,
      sendTipError.value.reason ? sendTipError.value.reason : 'Failed to send tip'
    )
  }
})
watch(pushTipSuccess, () => {
  if (pushTipSuccess.value) {
    show(ToastType.Success, 'Tips pushed successfully')
  }
})
watch(sendTipSuccess, async () => {
  if (sendTipSuccess.value) {
    await getBalance()
    show(ToastType.Success, 'Tips sent successfully')
  }
})
watch(balanceError, () => {
  if (balanceError.value) {
    console.log(balanceError.value)
    show(ToastType.Error, 'Failed to fetch team balance')
  }
})
watch(createBankError, () => {
  if (createBankError.value) {
    show(ToastType.Error, 'Failed to create bank contract')
  }
})
watch(createBankSuccess, () => {
  if (createBankSuccess.value) {
    show(ToastType.Success, 'Bank contract created successfully')
  }
})
watch(depositSuccess, () => {
  if (depositSuccess.value) {
    show(ToastType.Success, 'Deposited successfully')
  }
})
watch(depositError, () => {
  if (depositError.value) {
    show(ToastType.Error, 'Deposit failed')
  }
})
watch(transferSuccess, () => {
  if (transferSuccess.value) {
    show(ToastType.Success, 'Transfer successfully')
  }
})
watch(transferError, () => {
  if (transferError.value) {
    show(
      ToastType.Error,
      transferError.value.reason ? transferError.value.reason : 'Transfer failed'
    )
  }
})

const teamApi = new FetchTeamAPI()

const cname = ref('')
const cdesc = ref('')

const showModal = ref(false)
const bankModal = ref(false)
const depositModal = ref(false)
const transferModal = ref(false)

const showUpdateMemberModal = ref(false)
const showAddMemberForm = ref(false)

const inputs = ref<Member[]>([])
const team = ref<Team>({
  id: '',
  name: '',
  description: '',
  bankAddress: null,
  members: []
})

const teamMembers = ref([
  {
    name: '',
    walletAddress: '',
    isValid: false
  }
])
const updateMemberInput = ref<MemberInput>({
  name: '',
  walletAddress: '',
  id: '',
  isValid: false
})
const addInput = () => {
  teamMembers.value.push({ name: '', walletAddress: '', isValid: false })
}

const removeInput = () => {
  if (teamMembers.value.length > 1) {
    teamMembers.value.pop()
  }
}
const toggleUpdateMemberModal = (member: MemberInput) => {
  showUpdateMemberModal.value = !showUpdateMemberModal.value
  const updatedMember = { ...member }
  updateMemberInput.value = updatedMember
}
const handleUpdateForm = async () => {
  teamMembers.value.map((member) => {
    if (!isAddress(member.walletAddress)) {
      member.isValid = false
    } else {
      member.isValid = true
    }
  })
}
const handleAddMembers = async () => {
  try {
    const members: Member[] = await memberApi.createMembers(
      teamMembers.value,
      String(route.params.id)
    )
    if (members && members.length > 0) {
      show(ToastType.Success, 'Members added successfully')
      team.value.members = members
      showAddMemberForm.value = false
    }
  } catch (error) {
    return useErrorHandler().handleError(error)
  }
}
onMounted(async () => {
  const id = route.params.id
  try {
    const teamData = await teamApi.getTeam(String(id))
    if (teamData) {
      team.value = teamData
      cname.value = team.value.name
      cdesc.value = team.value.description
    } else {
      console.log('Team not found for id:', id)
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
const deleteMember = async (id: string) => {
  try {
    const memberRes: any = await memberApi.deleteMember(id)
    if (memberRes && memberRes.count == 1) {
      show(ToastType.Success, 'Member deleted successfully')
      team.value.members.splice(
        team.value.members.findIndex((member) => member.id === id),
        1
      )
      showUpdateMemberModal.value = false
    }
  } catch (error) {
    return useErrorHandler().handleError(error)
  }
}
const updateMember = async (id: string) => {
  const member = {
    name: updateMemberInput.value.name,
    walletAddress: updateMemberInput.value.walletAddress
  }
  try {
    const updatedMember = await memberApi.updateMember(member, id)
    if (updatedMember && Object.keys(updatedMember).length !== 0) {
      show(ToastType.Success, 'Member updated successfully')
      team.value.members.map((member) => {
        if (member.id === id) {
          member.name = updatedMember.name
          member.walletAddress = updatedMember.walletAddress
        }
      })

      showUpdateMemberModal.value = false
    }
  } catch (error) {
    return useErrorHandler().handleError(error)
  }
}
const updateTeam = async () => {
  const id = route.params.id
  let teamObject = {
    name: cname.value,
    description: cdesc.value
  }
  try {
    const teamRes = await teamApi.updateTeam(String(id), teamObject)
    if (teamRes) {
      show(ToastType.Success, 'Team updated successfully')
      team.value.name = teamRes.name
      team.value.description = teamRes.description
      showModal.value = false
    }
  } catch (error) {
    return useErrorHandler().handleError(error)
  }
}

const deleteTeam = async () => {
  const id = route.params.id
  try {
    const response: any = await teamApi.deleteTeam(String(id))
    if (response) {
      show(ToastType.Success, 'Team deleted successfully')
      router.push('/teams')
    }
  } catch (error) {
    return useErrorHandler().handleError(error)
  }
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
watch(
  updateMemberInput,
  (newVal) => {
    updateMemberInput.value.isValid = isAddress(newVal.walletAddress)
  },
  { deep: true }
)
const membersAddress = computed(() => {
  return team.value.members.map((member) => member.walletAddress)
})
</script>
