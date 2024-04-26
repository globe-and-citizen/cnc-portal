<template>
  <div class="pt-10 flex flex-col gap-5">
    <div class="flex justify-between gap-5">
      <div>
        <h2 class="pl-5">{{ team.name }}</h2>
        <p>{{ team.description }}</p>
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
    <TipsAction :addresses="team.members.map((member) => member.walletAddress)" />
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
import MemberCard from '@/components/MemberCard.vue'
import { onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AddMemberCard from '@/components/AddMemberCard.vue'
import TipsAction from '@/components/TipsAction.vue'

import type { Member, MemberInput, Team } from '@/types/types'
import { FetchTeamAPI } from '@/apis/teamApi'
import { FetchMemberAPI } from '@/apis/memberApi'

import { isAddress } from 'ethers' // ethers v6
import { useToastStore } from '@/stores/toast'
import { ToastType } from '@/types'

const { show } = useToastStore()

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
  try {
    let isValid = true

    teamMembers.value.map((member) => {
      if (!isAddress(member.walletAddress)) {
        isValid = false
      }
    })

    if (!isValid) {
      show(ToastType.Warning, 'Invalid wallet address')

      console.error('Invalid wallet address for one or more team members')
      return
    }
    await memberApi.createMembers(teamMembers.value, String(route.params.id))

    window.location.reload()
  } catch (error) {
    console.error('Error adding members:', error)
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
  memberApi
    .deleteMember(id)
    .then(() => {
      console.log('Deleted member succesfully')
      window.location.reload()
    })
    .catch((error) => {
      console.log('Delete member failed', error)
    })
}
const updateMember = async (id: string) => {
  console.log(id)
  const member = {
    name: updateMemberInput.value.name,
    walletAddress: updateMemberInput.value.walletAddress
  }
  memberApi
    .updateMember(member, id)
    .then((response) => {
      console.log('Updated member successfully', response)
      window.location.reload()
    })
    .catch((error) => {
      console.log('Error updating member', error)
    })
}
const updateTeam = async () => {
  const id = route.params.id
  let teamObject = {
    name: cname.value,
    description: cdesc.value
  }
  teamApi
    .updateTeam(String(id), teamObject)
    .then((updatedTeam) => {
      console.log('Updated team:', updatedTeam)
      window.location.reload()
    })
    .catch((error) => {
      console.error('Error updating team:', error)
    })
}

const deleteTeam = async () => {
  const id = route.params.id
  teamApi
    .deleteTeam(String(id))
    .then(() => {
      console.log('Team deleted successfully')
      router.push('/teams')
    })
    .catch((error) => {
      console.error('Error deleting team:', error)
    })
}
watch(
  updateMemberInput,
  (newVal) => {
    updateMemberInput.value.isValid = isAddress(newVal.walletAddress)
  },
  { deep: true }
)
</script>
