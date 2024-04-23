<template>
  <tr @click="showModal = true" class="cursor-pointer">
    <th>{{ memberId }}</th>
    <th>{{ memberName }}</th>
    <th>{{ walletAddress }}</th>
    <th>Action</th>
  </tr>

  <dialog
    id="my_modal_20"
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
      <h1 class="font-bold text-2xl">Update Member Details</h1>
      <hr class="" />
      <label class="input input-bordered flex items-center gap-2 input-md mt-2">
        <input type="text" class="w-24" v-model="nameInput" />
        |
        <input type="text" class="grow" v-model="walletInput" />
      </label>
      <div class="flex mt-2 justify-between">
        <button class="btn btn-error size-sm" @click="deleteMember">Delete</button>
        <button class="btn btn-primary" @click="updateMember">Update</button>
      </div>
    </div>
    <div></div>
  </dialog>
</template>
<script setup lang="ts">
import { FetchMemberAPI } from '@/apis/memberApi'
import { ref } from 'vue'
const showModal = ref(false)

const nameInput = ref('')
const walletInput = ref('')

const memberApi = new FetchMemberAPI()

const props = defineProps(['memberName', 'walletAddress', 'memberId'])
nameInput.value = props.memberName
walletInput.value = props.walletAddress
console.log(nameInput.value)

const deleteMember = async () => {
  const id = props.memberId
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
const updateMember = async () => {
  const id = props.memberId

  const member = {
    name: nameInput.value,
    walletAddress: walletInput.value
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
</script>
