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
    <div class="card w-full bg-base-100 overflow-x-auto p-4">
      <table class="table">
        <!-- head -->
        <thead>
          <tr>
            <th>Name</th>
            <th>Address</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          <MemberCard
            v-for="(member, index) in team.members"
            :teamId="Number(team.id)"
            :member="member"
            :key="index"
            :showUpdateMemberModal="showUpdateMemberModal"
            @deleteMember="(id, address) => deleteMember(id, address)"
            @toggleUpdateMemberModal="toggleUpdateMemberModal"
          />
        </tbody>
      </table>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-20">
      <AddMemberCard
        :users="foundUsers"
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
    <TipsAction
      :pushTipLoading="pushTipLoading"
      :sendTipLoading="sendTipLoading"
      @pushTip="(amount) => pushTip(membersAddress, amount)"
      @sendTip="(amount) => sendTip(membersAddress, amount)"
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
import { onMounted, ref, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AddMemberCard from '@/components/AddMemberCard.vue'
import TipsAction from '@/components/TipsAction.vue'

import { ToastType, type Member, type User, type Team } from '@/types'
import { FetchTeamAPI } from '@/apis/teamApi'

import { isAddress } from 'ethers' // ethers v6
import { useToastStore } from '@/stores/toast'
import { usePushTip, useSendTip } from '@/composables/tips'

import { useErrorHandler } from '@/composables/errorHandler'
import { FetchUserAPI } from '@/apis/userApi'
const userApi = new FetchUserAPI()

const { show } = useToastStore()

const foundUsers = ref<User[]>([])

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
watch(pushTipError, () => {
  if (pushTipError.value) {
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
watch(sendTipSuccess, () => {
  if (sendTipSuccess.value) {
    show(ToastType.Success, 'Tips sent successfully')
  }
})

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
const toggleUpdateMemberModal = () => {
  showUpdateMemberModal.value = !showUpdateMemberModal.value
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
const handleAddMembers = async () => {
  try {
    const members: Member[] = await teamApi.createMembers(
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
  } catch (error) {
    return useErrorHandler().handleError(error)
  }
})
const updateTeamModalOpen = async () => {
  showModal.value = true
  inputs.value = team.value.members
}
const deleteMember = async (id: string, address: string) => {
  try {
    const memberRes: any = await teamApi.deleteMember(id, address)
    console.log('memberRes', memberRes)
    if (memberRes) {
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
const searchUsers = async (input: { name: string; address: string }) => {
  try {
    const users = await userApi.searchUser(input.name, input.address)
    foundUsers.value = users
    console.log(users)
  } catch (error) {
    foundUsers.value = []
    return useErrorHandler().handleError(error)
  }
}
const membersAddress = computed(() => {
  return team.value.members.map((member) => member.address)
})
</script>
