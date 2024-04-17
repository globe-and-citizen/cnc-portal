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
<script setup lang="ts">
import { ref } from 'vue'
const showModal = ref(false)

const nameInput = ref('')
const walletInput = ref('')

const props = defineProps(['memberName', 'walletAddress', 'memberId'])
nameInput.value = props.memberName
walletInput.value = props.walletAddress
console.log(nameInput.value)

const deleteMember = async () => {
  const id = props.memberId
  const requestOptions = {
    method: 'DELETE'
  }

  try {
    const response = await fetch(`http://localhost:3000/member/${id}`, requestOptions)
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`)
    }
  } catch (error) {
    console.error('Error:', error)
  }
  window.location.reload()
}
const updateMember = async () => {
  const id = props.memberId
  const requestOptions = {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: nameInput.value,
      walletAddress: walletInput.value
    })
  }

  try {
    const response = await fetch(`http://localhost:3000/member/${id}`, requestOptions)
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`)
    }
  } catch (error) {
    console.error('Error:', error)
  }
  window.location.reload()
}
</script>
