<template>
  <div class="pt-10">
    <div class="flex justify-between">
      <h2 class="pl-5">{{ team.name }}</h2>
      <div class="flex justify-between gap-2 items-center">
        <button class="btn btn-primary" @click="updateTeamModalOpen">Update</button>

        <button class="btn btn-primary" @click="deleteTeam">Delete Team</button>
      </div>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-20">
      <MemberCard
        v-for="member in team.members"
        :memberName="member.name"
        :walletAddress="member.walletAddress"
        :memberId="member.id"
        :key="member.id"
      />
      <AddMemberCard :id="team.id" />
    </div>
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

import axios from 'axios'
const route = useRoute()
const router = useRouter()

const cname = ref('')
const cdesc = ref('')

const showModal = ref(false)
const inputs = ref([{ name: '', walletAddress: '' }])
interface Team {
  id: string
  name: string
  description: string
  members: Member[]
}
interface Member {
  id: string
  name: string
  walletAddress: string
  teamId: number
}
const team = ref<Team>({
  id: '',
  name: '',
  description: '',
  members: []
})

onMounted(async () => {
  const id = route.params.id

  console.log('hi', id)
  try {
    const response = await axios.post(`http://localhost:3000/api/teams/${id}`, {
      address: 'user_address_321'
    })
    team.value = response.data
    cname.value = team.value.name
    cdesc.value = team.value.description
  } catch (error) {
    console.error('Error fetching data:', error)
  }
})
const updateTeamModalOpen = async () => {
  showModal.value = true
  inputs.value = team.value.members
}
const updateTeam = async () => {
  const id = route.params.id
  try {
    let teamObject = {
      name: cname.value,
      description: cdesc.value,
      address: 'user_address_321'
    }
    console.log('Updated team object:', teamObject)

    let response = await axios.put(`http://localhost:3000/api/teams/${id}`, teamObject)

    console.log('Response:', response.data)

    window.location.reload()
  } catch (error) {
    console.error('Error updating data:', error)
  }
}

const deleteTeam = async () => {
  try {
    const id = route.params.id

    const response = await axios.delete(`http://localhost:3000/api/teams/${id}`, {
      data: {
        address: 'user_address_321'
      }
    })
    console.log(response.data)
    router.push('/teams')
  } catch (error) {
    console.error('Error fetching data:', error)
  }
}
</script>
