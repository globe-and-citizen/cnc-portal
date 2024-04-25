<template>
  <tr @click="emits('toggleUpdateMemberForm')" class="cursor-pointer">
    <th>{{ memberId }}</th>
    <th>{{ memberName }}</th>
    <th>{{ walletAddress }}</th>
    <th>Action</th>
  </tr>

  <dialog
    id="my_modal_20"
    class="modal modal-bottom sm:modal-middle"
    :class="{ 'modal-open': showUpdateMemberForm }"
  >
    <div class="modal-box">
      <button
        class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
        @click="emits('toggleUpdateMemberForm')"
      >
        <span @click="emits('toggleUpdateMemberForm')">x</span>
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
import { ref, watch } from 'vue'

const nameInput = ref('')
const walletInput = ref('')

const memberApi = new FetchMemberAPI()

const emits = defineEmits(['toggleUpdateMemberForm'])
const props = defineProps(['memberName', 'walletAddress', 'memberId', 'showUpdateMemberForm'])
nameInput.value = props.memberName
walletInput.value = props.walletAddress
console.log(nameInput.value)

const showUpdateMemberForm = ref<boolean>(props.showUpdateMemberForm)
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
watch(
  () => props.showUpdateMemberForm,
  (newValue) => {
    showUpdateMemberForm.value = newValue
  }
)
</script>
