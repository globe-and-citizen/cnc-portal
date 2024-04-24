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
            :memberName="member.name"
            :walletAddress="member.walletAddress"
            :memberId="member.id"
            :key="member.id"
          />
        </tbody>
      </table>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-20">
      <AddMemberCard :id="team.id" @addMembers="handleAddMembers" />
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
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AddMemberCard from '@/components/AddMemberCard.vue'
import TipsAction from '@/components/TipsAction.vue'

import type { Member, Team } from '@/types/types'
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
const inputs = ref<Member[]>([])
const team = ref<Team>({
  id: '',
  name: '',
  description: '',
  members: []
})

const handleAddMembers = async (newMembers: Member[], id: string) => {
  try {
    let isValid = true
    let errorIndexes: number[] = []
    console.log(newMembers)
    newMembers.map((member, index) => {
      if (!isAddress(member.walletAddress)) {
        isValid = false
        errorIndexes.push(index)
      }
    })

    if (!isValid) {
      show(ToastType.Warning, 'Invalid wallet address')

      console.error('Invalid wallet address for one or more team members')
      return
    }
    await memberApi.createMembers(newMembers, id)
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
</script>
