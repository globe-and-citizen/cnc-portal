<template>
  <div class="card w-full bg-white">
    <div class="card-body flex justify-center items-center">
      <h1 class="card-title">Add Member</h1>

      <div class="w-6 h-6 cursor-pointer" @click="showModal = true">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="lightgreen"
          viewBox="0 0 24 24"
          strokeWidth="{10.5}"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
          />
        </svg>
      </div>
    </div>
  </div>
  <dialog
    id="my_modal_10"
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
      <h1 class="font-bold text-2xl">Add New Member</h1>
      <hr class="" />
      <div v-for="(input, index) in inputs" :key="index" class="input-group mt-3">
        <label class="input input-bordered flex items-center gap-2 input-md">
          <input
            type="text"
            class="w-24"
            v-model="input.name"
            :placeholder="'Member Name ' + (index + 1)"
          />
          |
          <input
            type="text"
            class="grow"
            v-model="input.walletAddress"
            :placeholder="'Wallet Address ' + (index + 1)"
          />
          <span class="badge badge-primary">Mandatory</span>
        </label>
      </div>
      <div class="flex justify-end pt-3">
        <div class="w-6 h-6 cursor-pointer" @click="addInput">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="lightgreen"
            viewBox="0 0 24 24"
            strokeWidth="{10.5}"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
            />
          </svg>
        </div>
        <div class="w-6 h-6 cursor-pointer" @click="removeInput">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="red"
            viewBox="0 0 24 24"
            strokeWidth="{1.5}"
            stroke="currentColor"
            className="w-6 h-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 12H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
            />
          </svg>
        </div>
      </div>
      <div class="flex justify-center" @click="addMembers">
        <button class="btn btn-primary justify-center">Add</button>
      </div>
    </div>
  </dialog>
</template>
<script setup lang="ts">
import { ref, toRaw } from 'vue'

const emits = defineEmits(['addMembers'])

const showModal = ref(false)
const props = defineProps<{ id: string }>()
const inputs = ref([{ name: '', walletAddress: '' }])

const addInput = () => inputs.value.push({ name: '', walletAddress: '' })
const removeInput = () => {
  if (inputs.value.length > 1) inputs.value.pop()
}
const addMembers = async () => {
  let newMembers = toRaw(inputs.value)
  let id = props.id

  try {
    emits('addMembers', newMembers, id)
  } catch (error) {
    console.error('Error creating members:', error)
  }
}
</script>
