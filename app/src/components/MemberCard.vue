<template>
  <div class="card w-full bg-white ml-5 mt-10 cursor-pointer" @click="showModal = true">
    <div class="card-body">
      <h1 class="card-title">{{ memberName }}</h1>
      <p class="text-sm">{{ walletAddress }}</p>
      <div class="card-actions justify-between"></div>
    </div>
  </div>

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
        <input type="text" class="grow" v-model="nameInput" />
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
<script setup>
import { ref } from 'vue'
import axios from 'axios'
const showModal = ref(false)

const nameInput = ref('')
const walletInput = ref('')

const props = defineProps(['memberName', 'walletAddress', 'memberId'])
nameInput.value = props.memberName
walletInput.value = props.walletAddress
console.log(nameInput.value)

const deleteMember = async () => {
  try {
    const id = props.memberId
    await axios.delete(`http://localhost:3000/member/${id}`)
    window.location.reload(false)
  } catch (error) {
    console.log('Error deleting member', error)
  }
}
const updateMember = async () => {
  try {
    const id = props.memberId
    await axios.put(`http://localhost:3000/member/${id}`, {
      name: nameInput.value,
      walletAddress: walletInput.value
    })
    window.location.reload(false)
  } catch (error) {
    console.log('Error updating Member', error)
  }
}
</script>
