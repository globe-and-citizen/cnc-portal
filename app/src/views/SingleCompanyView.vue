<template>
  <div class="pt-10">
    <div class="flex justify-between">
      <h2 class="pl-5">{{ company.name }}</h2>
      <div class="flex justify-between gap-2 items-center">
        <button class="btn btn-primary" @click="updateCompanyModalOpen">Update</button>

        <button class="btn btn-primary" @click="deleteCompany">Delete Company</button>
      </div>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-20">
      <EmployeeCard
        v-for="employee in company.employees"
        :employeeName="employee.name"
        :walletAddress="employee.walletAddress"
        :employeeId="employee.id"
        :key="employee.id"
      />
      <AddEmployeeCard :id="company.id" />
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

      <h1 class="font-bold text-2xl">Update Company Details</h1>
      <hr class="" />
      <div class="flex flex-col gap-5">
        <label class="input input-bordered flex items-center gap-2 input-md mt-4">
          <span class="w-28">Company Name</span>
          <input type="text" class="grow" placeholder="Enter company name" v-model="cname" />
        </label>
        <label class="input input-bordered flex items-center gap-2 input-md">
          <span class="w-28">Description</span>
          <input type="text" class="grow" placeholder="Enter short description" v-model="cdesc" />
        </label>
      </div>

      <div class="modal-action justify-center">
        <!-- if there is a button in form, it will close the modal -->
        <button class="btn btn-primary" @click="updateCompany">Submit</button>

        <!-- <button class="btn" @click="showModal = !showModal">Close</button> -->
      </div>
    </div>
  </dialog>
</template>
<script setup>
import EmployeeCard from '@/components/EmployeeCard.vue'
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AddEmployeeCard from '@/components/AddEmployeeCard.vue'

import axios from 'axios'
const route = useRoute()
const router = useRouter()

const company = ref([])
const cname = ref('')
const cdesc = ref('')

const showModal = ref(false)
const inputs = ref([{ name: '', walletAddress: '' }])

onMounted(async () => {
  const id = route.params.id

  console.log('hi', id)
  try {
    const response = await axios.post(`http://localhost:3000/companies/${id}`, {
      address: 'user_address_321'
    })
    company.value = response.data
    cname.value = company.value.name
    cdesc.value = company.value.description
  } catch (error) {
    console.error('Error fetching data:', error)
  }
})
const updateCompanyModalOpen = async () => {
  showModal.value = true
  inputs.value = company.value.employees
}
const updateCompany = async () => {
  const id = route.params.id
  try {
    // Prepare the company object with updated data
    let companyObject = {
      name: cname.value,
      description: cdesc.value,
      address: 'user_address_321'
    }
    console.log('Updated company object:', companyObject)

    // Make the PUT request to update the company
    let response = await axios.put(`http://localhost:3000/companies/${id}`, companyObject)

    // Handle the response as needed
    console.log('Response:', response.data)

    // Reload the page or perform other actions after successful update
    window.location.reload(false)
  } catch (error) {
    console.error('Error updating data:', error)
  }
}

const deleteCompany = async () => {
  try {
    const id = route.params.id

    const response = await axios.delete(`http://localhost:3000/companies/${id}`, {
      address: 'user_address_321'
    })
    console.log(response.data)
    router.push('/companies')
  } catch (error) {
    console.error('Error fetching data:', error)
  }
}
</script>
