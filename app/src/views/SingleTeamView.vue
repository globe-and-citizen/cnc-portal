<template>
  <div class="pt-10 flex flex-col gap-5">
    <div class="flex justify-between gap-5">
      <div>
        <h2 class="pl-5">{{ team.name }}</h2>
        <p class="pl-5">{{ team.description }}</p>
      </div>
      <div class="flex justify-between gap-2 items-center">
        <button class="btn btn-primary" @click="updateTeamModalOpen">Update</button>

        <button class="btn btn-primary" @click="deleteTeam">Delete Team</button>
      </div>
    </div>
    <div class="card w-full bg-white overflow-x-auto p-4">
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
            v-model:updateMemberInput="updateMemberInput"
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
      :addresses="team.members.map((member) => member.walletAddress)"
      :pushTipLoading="pushTipLoading"
      :sendTipLoading="sendTipLoading"
      :tipAmount="tipAmount"
      @pushTip="(addresses, amount) => pushTip(addresses, amount)"
      @sendTip="(addresses, amount) => sendTip(addresses, amount)"
    />
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
</template>
<script setup lang="ts">
import { useTipsStore } from '@/stores/tips'
import { storeToRefs } from 'pinia'
import MemberCard from '@/components/MemberCard.vue'
import { onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AddMemberCard from '@/components/AddMemberCard.vue'
import TipsAction from '@/components/TipsAction.vue'

import { ToastType, type Member, type MemberInput, type Team } from '@/types'
import { FetchTeamAPI } from '@/apis/teamApi'
import { FetchMemberAPI } from '@/apis/memberApi'

import { isAddress } from 'ethers' // ethers v6
import { useToastStore } from '@/stores/toast'

const { show } = useToastStore()

const tipStore = useTipsStore()
const { pushTip, sendTip } = useTipsStore()
const { sendTipLoading, pushTipLoading } = storeToRefs(tipStore)
const tipAmount = ref(0)

const memberApi = new FetchMemberAPI()
const route = useRoute()
const router = useRouter()

const teamApi = new FetchTeamAPI()

const cname = ref('')
const cdesc = ref('')

const showModal = ref(false)

const showUpdateMemberModal = ref(false)
const showAddMemberForm = ref(false)

const inputs = ref<Member[]>([])
const team = ref<Team>({
  id: '',
  name: '',
  description: '',
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
  updateMemberInput.value = member
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
  let isValid = true

  teamMembers.value.map((member) => {
    if (!isAddress(member.walletAddress)) isValid = false
  })

  if (!isValid) {
    show(ToastType.Warning, 'Invalid wallet address')
    return
  }
  const members: Member[] = await memberApi.createMembers(
    teamMembers.value,
    String(route.params.id)
  )
  if (members && members.length > 0) {
    show(ToastType.Success, 'Members added successfully')
    team.value.members = members
    showAddMemberForm.value = false
  }
}
onMounted(async () => {
  const id = route.params.id

  teamApi
    .getTeam(String(id))
    .then((teamData) => {
      if (teamData) {
        team.value = teamData
        cname.value = team.value.name
        cdesc.value = team.value.description
      } else {
        console.log('Team not found for id:', id)
      }
    })
    .catch((error) => {
      console.error('Error fetching team:', error)
    })
})
const updateTeamModalOpen = async () => {
  showModal.value = true
  inputs.value = team.value.members
}
const deleteMember = async (id: string) => {
  const memberRes: any = await memberApi.deleteMember(id)
  console.log('Deleted member:', memberRes)
  if (memberRes && memberRes.count == 1) {
    show(ToastType.Success, 'Member deleted successfully')
    team.value.members.splice(
      team.value.members.findIndex((member) => member.id === id),
      1
    )

    showUpdateMemberModal.value = false
  }
}
const updateMember = async (id: string) => {
  const member = {
    name: updateMemberInput.value.name,
    walletAddress: updateMemberInput.value.walletAddress
  }
  const updatedMember = await memberApi.updateMember(member, id)
  console.log('Updated member:', updatedMember)
  if (updatedMember) {
    show(ToastType.Success, 'Member updated successfully')
    showUpdateMemberModal.value = false
  }
}
const updateTeam = async () => {
  const id = route.params.id
  let teamObject = {
    name: cname.value,
    description: cdesc.value
  }
  const team = await teamApi.updateTeam(String(id), teamObject)
  if (team) {
    show(ToastType.Success, 'Team updated successfully')
    showModal.value = false
  }
}

const deleteTeam = async () => {
  const id = route.params.id
  const response: any = await teamApi.deleteTeam(String(id))
  if (response && response.count == 1) {
    show(ToastType.Success, 'Team deleted successfully')
    router.push('/teams')
  }
}
watch(
  updateMemberInput,
  (newVal) => {
    updateMemberInput.value.isValid = isAddress(newVal.walletAddress)
  },
  { deep: true }
)
</script>
