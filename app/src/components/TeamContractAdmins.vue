<template>
  <h3 class="text-lg font-bold mb-4">Contract Admin List {{ range }}</h3>

  <!-- Inline form to add new admin -->
  <form
    @submit.prevent="handleAdminAction(newAdminAddress, 'addAdmin')"
    class="flex items-center space-x-2 mb-4"
  >
    <input
      v-model="newAdminAddress"
      type="text"
      placeholder="Enter new admin address"
      class="input input-bordered input-sm w-full max-w-xs"
      required
    />
    <div>
      <ButtonUI type="submit" variant="primary" size="sm"> Add Admin</ButtonUI>
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
            <ButtonUI @click="handleAdminAction(admin, 'removeAdmin')" size="xs" variant="error"
              >Remove</ButtonUI
            >
          </td>
        </tr>
      </tbody>
    </table>
  </div>
  <div
    v-if="isLoading || isUpdating"
    class="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75"
  ></div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'

import { useToastStore } from '@/stores/useToastStore'
import AdCampaignArtifact from '@/artifacts/abi/AdCampaignManager.json'
import { useWaitForTransactionReceipt, useWatchContractEvent, useWriteContract } from '@wagmi/vue'
import { AddCampaignService } from '@/services/AddCampaignService'
import type { TeamContract } from '@/types'
import AddressToolTip from './AddressToolTip.vue'
import ButtonUI from './ButtonUI.vue'
import { parseAbi } from 'viem'

const { addErrorToast, addSuccessToast } = useToastStore()
const addCampaignService = new AddCampaignService()

const props = defineProps<{
  contract: TeamContract
  range: number
}>()

const adminAbi = parseAbi([
  'event AdminAdded(address indexed admin)',
  'event AdminRemoved(address indexed admin)'
])
const isUpdating = ref(false)
const campaignAbi = AdCampaignArtifact.abi
const isLoading = computed(
  () =>
    loadingRemoveAdmin.value ||
    (isConfirmingRemoveAdmin.value && !isConfirmedRemoveAdmin.value) ||
    loadingAddAdmin.value ||
    (isConfirmingAddAdmin.value && !isConfirmedAddAdmin.value)
)

// State for new admin address
const newAdminAddress = ref('')

// State for admins list
const admins = ref([] as string[])

const {
  writeContract: addAdmin,
  error: errorAddAdmin,
  isPending: loadingAddAdmin,
  data: hashAddAdmin
} = useWriteContract()

const { isLoading: isConfirmingAddAdmin, isSuccess: isConfirmedAddAdmin } =
  useWaitForTransactionReceipt({
    hash: hashAddAdmin
  })
watch(isConfirmingAddAdmin, async (isConfirming, wasConfirming) => {
  if (wasConfirming && !isConfirming && isConfirmedAddAdmin.value) {
    addSuccessToast('Admin added successfully')
    newAdminAddress.value = ''
  }
})

const {
  writeContract: removeAdmin,
  error: errorRemoveAdmin,
  isPending: loadingRemoveAdmin,
  data: hashRemoveAdmin
} = useWriteContract()

const { isLoading: isConfirmingRemoveAdmin, isSuccess: isConfirmedRemoveAdmin } =
  useWaitForTransactionReceipt({
    hash: hashRemoveAdmin
  })
watch(isConfirmingRemoveAdmin, async (isConfirming, wasConfirming) => {
  if (wasConfirming && !isConfirming && isConfirmedRemoveAdmin.value) {
    addSuccessToast('Admin removed successfully')
  }
})

watch(
  () => props.contract,
  async (newContract) => {
    isUpdating.value = true
    await new Promise((resolve) => setTimeout(resolve, 5000))
    admins.value = await addCampaignService.getAdminList(newContract.address)
    await addCampaignService.getEventsGroupedByCampaignCode(newContract.address)
    isUpdating.value = false
  }
)

watch(errorAddAdmin, () => {
  if (errorAddAdmin.value) {
    addErrorToast('Add admin failed')
  }
})

watch(errorRemoveAdmin, () => {
  if (errorRemoveAdmin.value) {
    addErrorToast('Remove admin failed')
  }
})

useWatchContractEvent({
  address: props.contract.address,
  abi: adminAbi,
  eventName: 'AdminAdded',
  strict: true,
  onLogs: async (logs) => {
    for (const log of logs) {
      if (log?.args.admin) {
        const addedAdmin = log.args.admin as `0x${string}`
        if (!admins.value.includes(addedAdmin)) {
          admins.value.push(addedAdmin)
        }
      }
    }
  }
})

useWatchContractEvent({
  address: props.contract.address,
  abi: adminAbi,
  eventName: 'AdminRemoved',
  strict: true,
  onLogs: async (logs) => {
    for (const log of logs) {
      if (log?.args.admin) {
        const removedAdmin = log.args.admin as `0x${string}`
        if (admins.value.includes(removedAdmin)) {
          admins.value = admins.value.filter((a) => a.toLowerCase() !== removedAdmin.toLowerCase())
        }
      }
    }
  }
})

function handleAdminAction(adminAddress: string, action: string) {
  if (action === 'removeAdmin') {
    removeAdmin({
      address: props.contract.address,
      abi: campaignAbi,
      functionName: 'removeAdmin',
      args: [adminAddress]
    })
  } else {
    addAdmin({
      address: props.contract.address,
      abi: campaignAbi,
      functionName: 'addAdmin',
      args: [adminAddress]
    })
  }
}
</script>
