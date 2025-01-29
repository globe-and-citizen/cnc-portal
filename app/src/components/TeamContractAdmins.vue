<template>
  <h3 class="text-lg font-bold mb-4">Contract Admin List</h3>

  <!-- Inline form to add new admin -->
  <form @submit.prevent="addAdmin()" class="flex items-center space-x-2 mb-4">
    <input
      v-model="newAdminAddress"
      type="text"
      placeholder="Enter new admin address"
      class="input input-bordered input-sm w-full max-w-xs"
      required
    />
    <div>
      <ButtonUI type="submit" variant="primary" size="sm" v-if="!isLoading">Add Admin</ButtonUI>
    </div>
  </form>

  <!-- Admin Table -->
  <div id="admins-table" class="overflow-x-auto">
    <table class="table w-full">
      <!-- Table Header -->
      <thead>
        <tr>
          <th>#</th>
          <th>Admin Address</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        <!-- Admin Rows -->
        <tr v-for="(admin, index) in admins" :key="index" class="hover:bg-base-200">
          <th>{{ index + 1 }}</th>
          <td><AddressToolTip :address="admin" class="text-xs" /></td>
          <td>
            <ButtonUI @click="removeAdmin(admin)" size="xs" variant="error">Remove</ButtonUI>
          </td>
        </tr>
      </tbody>
    </table>
    <div
      v-if="isLoading"
      class="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { ref, defineProps, watch } from 'vue'
import { isAddress } from 'viem'
import { useToastStore } from '@/stores/useToastStore'
import { AddCampaignService } from '@/services/AddCampaignService'
import type { TeamContract } from '@/types'
import AddressToolTip from './AddressToolTip.vue'
import ButtonUI from './ButtonUI.vue'

const { addErrorToast, addSuccessToast } = useToastStore()
const addCamapaignService = new AddCampaignService()

const props = defineProps<{
  contract: TeamContract
}>()

const isLoading = ref(false)
const emit = defineEmits<{
  updateTeamContract: [updatedContractPayload: TeamContract] // named tuple syntax
}>()

// State for new admin address
const newAdminAddress = ref('')

// State for admins list
const admins = ref([] as string[])

watch(
  () => props.contract,
  async (newContract) => {
    //const adminList= await addCamapaignService.getAdminList(newContract.address)
    isLoading.value = true
    admins.value = await addCamapaignService.getAdminList(newContract.address)
    isLoading.value = false
    await addCamapaignService.getEventsGroupedByCampaignCode(newContract.address)
  }
)

// Remove admin handler
async function removeAdmin(adminAddress: string) {
  if (!isAddress(adminAddress)) {
    addErrorToast('please provide valid address')
  } else {
    isLoading.value = true
    const result = await addCamapaignService.removeAdmin(props.contract.address, adminAddress)

    if (result.status === 1) {
      addSuccessToast('Admin removed successfully')
      isLoading.value = false
      admins.value = await addCamapaignService.getAdminList(props.contract.address)
    } else {
      addErrorToast('remove  admin failed plese try again')
      isLoading.value = false
    }
  }
}

// Add admin directly without confirmation
async function addAdmin() {
  if (!isAddress(newAdminAddress.value)) {
    addErrorToast('please provide valid address')
  } else {
    isLoading.value = true
    const result = await addCamapaignService.addAdmin(props.contract.address, newAdminAddress.value)
    if (result.status === 1) {
      addSuccessToast('Admin added successfully')

      admins.value = await addCamapaignService.getAdminList(props.contract.address)
      isLoading.value = false
      newAdminAddress.value = ''
      // Emit the updated contract with the new admins list
      emit('updateTeamContract', {
        ...props.contract,
        admins: admins.value
      })
    } else {
      addErrorToast('Add admin failed')
      isLoading.value = false
    }
  }
}
</script>
