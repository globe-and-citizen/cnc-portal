<template>
  <h3 class="mb-4 text-lg font-bold">
    Contract Admin List {{ range }}
    <span class="loading loading-spinner" v-if="isLoading || isUpdating"></span>
  </h3>

  <!-- Inline form to add new admin -->
  <form
    @submit.prevent="handleAdminAction(newAdminAddress as `0x${string}`, 'addAdmin')"
    class="mb-4 flex items-center space-x-2"
  >
    <input
      v-model="newAdminAddress"
      type="text"
      placeholder="Enter new admin address"
      class="input input-bordered input-sm w-full max-w-xs"
      required
    />
    <div>
      <UButton type="submit" color="primary" size="sm"> Add Admin</UButton>
    </div>
  </form>

  <!-- Admin Table -->
  <div id="admins-table" class="overflow-x-auto">
    <UTable
      :data="
        adminsList.map((admin: Address, index: number) => ({
          index: index + 1,
          address: admin,
          admin: admin
        })) ?? []
      "
      :columns="[
        { accessorKey: 'index', header: '#' },
        { accessorKey: 'address', header: 'Admin Address' },
        { accessorKey: 'action', header: 'Action' }
      ]"
    >
      <template #address-cell="{ row: { original: row } }">
        <AddressToolTip :address="row.address" class="text-xs" />
      </template>

      <template #action-cell="{ row: { original: row } }">
        <UButton
          @click="handleAdminAction(row.admin, 'removeAdmin')"
          size="xs"
          color="error"
          label="Remove"
        />
      </template>
    </UTable>
  </div>
  <div
    v-if="isLoading || isUpdating"
    class="bg-opacity-75 absolute inset-0 flex items-center justify-center bg-white"
  ></div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'

import { useWaitForTransactionReceipt, useWriteContract, useReadContract } from '@wagmi/vue'
import { AddCampaignService } from '@/services/AddCampaignService'
import type { TeamContract } from '@/types'
import AddressToolTip from '@/components/AddressToolTip.vue'
import { AD_CAMPAIGN_MANAGER_ABI } from '@/artifacts/abi/ad-campaign-manager'
import type { Address } from 'viem'
const toast = useToast()
const addCampaignService = new AddCampaignService()

const props = defineProps<{
  contract: TeamContract
  range: number
}>()

const isUpdating = ref(false)

const isLoading = computed(
  () =>
    loadingRemoveAdmin.value ||
    (isConfirmingRemoveAdmin.value && !isConfirmedRemoveAdmin.value) ||
    loadingAddAdmin.value ||
    (isConfirmingAddAdmin.value && !isConfirmedAddAdmin.value)
)

// State for new admin address
const newAdminAddress = ref('')

const {
  mutate: addAdmin,
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
    toast.add({ title: 'Admin added successfully', color: 'success' })
    newAdminAddress.value = ''
    executeGetAdminList()
  }
})

const {
  mutate: removeAdmin,
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
    toast.add({ title: 'Admin removed successfully', color: 'success' })
    executeGetAdminList()
  }
})

const {
  data: admins,
  refetch: executeGetAdminList,
  error: errorGetAdminList
} = useReadContract({
  functionName: 'getAdminList',
  address: computed(() => props.contract?.address || ''),
  abi: AD_CAMPAIGN_MANAGER_ABI
})

const adminsList = computed<Address[]>(() => {
  return Array.isArray(admins.value) ? (admins.value as Address[]) : []
})

watch(
  () => props.contract,
  async (newContract) => {
    isUpdating.value = true
    await new Promise((resolve) => setTimeout(resolve, 5000))
    await addCampaignService.getEventsGroupedByCampaignCode(newContract.address)
    isUpdating.value = false
  }
)

watch(errorAddAdmin, () => {
  if (errorAddAdmin.value) {
    toast.add({ title: 'Add admin failed', color: 'error' })
  }
})

watch(errorGetAdminList, () => {
  if (errorGetAdminList.value) {
    toast.add({ title: 'get Admin list failed', color: 'error' })
  }
})

watch(errorRemoveAdmin, () => {
  if (errorRemoveAdmin.value) {
    toast.add({ title: 'Remove admin failed', color: 'error' })
  }
})

function handleAdminAction(adminAddress: Address, action: string) {
  if (action === 'removeAdmin') {
    removeAdmin({
      address: props.contract.address,
      abi: AD_CAMPAIGN_MANAGER_ABI,
      functionName: 'removeAdmin',
      args: [adminAddress]
    })
  } else {
    addAdmin({
      address: props.contract.address,
      abi: AD_CAMPAIGN_MANAGER_ABI,
      functionName: 'addAdmin',
      args: [adminAddress]
    })
  }
}
</script>
