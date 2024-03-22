<template>
  <div class="card w-80 bg-white ml-5 mt-5 flex justify-center items-center">
    <!-- <figure>
        <img :src="CompanyImage" alt="Company" />
      </figure> -->
    <div class="card-body flex justify-center items-center">
      <h1 class="card-title">Add Company</h1>

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
      <dialog
        id="my_modal_5"
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

          <h1 class="font-bold text-2xl">Create New Company</h1>
          <hr class="" />
          <div class="flex flex-col gap-5">
            <label class="input input-bordered flex items-center gap-2 input-md mt-4">
              <span class="w-28">Company Name</span>
              <input type="text" class="grow" placeholder="Daisy" v-model="companyName" />
            </label>
            <label class="input input-bordered flex items-center gap-2 input-md">
              <span class="w-28">Description</span>
              <input
                type="text"
                class="grow"
                placeholder="Enter a short description"
                v-model="companyDesc"
              />
            </label>

            <div v-for="(input, index) in inputs" :key="index" class="input-group">
              <label class="input input-bordered flex items-center gap-2 input-md">
                <input
                  type="text"
                  class="grow"
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

          <div class="modal-action justify-center">
            <!-- if there is a button in form, it will close the modal -->
            <button class="btn btn-primary" @click="handleSubmit">Submit</button>

            <!-- <button class="btn" @click="showModal = !showModal">Close</button> -->
          </div>
        </div>
      </dialog>
    </div>
  </div>
</template>

<script setup>
import { ref, toRaw } from 'vue'
import axios from 'axios'
const showModal = ref(false)
const companyName = ref('')
const companyDesc = ref('')
const inputs = ref([{ name: '', walletAddress: '' }])
const addInput = () => {
  inputs.value.push({ name: '', walletAddress: '' })
}
const handleSubmit = async () => {
  let companyMembers = { members: toRaw(inputs.value) }
  let companyObject = {
    name: companyName.value,
    description: companyDesc.value,
    employees: {
      createMany: {
        data: companyMembers.members
      }
    },
    address: 'user_address_321'
  }
  console.log(companyObject)
  await axios.post('http://localhost:3000/companies', companyObject)
  window.location.reload(false)
}
const removeInput = () => {
  if (inputs.value.length > 1) {
    inputs.value.pop()
  }
}
</script>
