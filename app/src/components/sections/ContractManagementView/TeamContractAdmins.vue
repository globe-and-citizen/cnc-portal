<template>
  <h3 class="text-lg font-bold mb-4">
    Contract Admin List {{ range }}
    <span class="loading loading-spinner" v-if="isLoading || isUpdating"></span>
  </h3>

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
    <TableComponent
      :rows="
        (admins [])?.map((admin: `0x${string}`, index: number) => ({
          index: index + 1,
          address: admin,
          admin: admin
        })) ?? []
      "
      :columns="[
        { key: 'index', label: '#' },
        { key: 'address', label: 'Admin Address' },
        { key: 'action', label: 'Action' }
      ]"
    >
      <template #address-data="{ row }">
        <AddressToolTip :address="row.address" class="text-xs" />
      </template>

      <template #action-data="{ row }">
        <ButtonUI @click="handleAdminAction(row.admin, 'removeAdmin')" size="xs" variant="error"
          >Remove</ButtonUI
        >
      </template>
    </TableComponent>
  </div>
  <div
    v-if="isLoading || isUpdating"
    class="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75"
  ></div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'

import { useToastStore } from '@/stores/useToastStore'

import { useWaitForTransactionReceipt, useWriteContract, useReadContract } from '@wagmi/vue'
import { AddCampaignService } from '@/services/AddCampaignService'
import type { TeamContract } from '@/types'
import AddressToolTip from '@/components/AddressToolTip.vue'
import ButtonUI from '@/components/ButtonUI.vue'
import TableComponent from '@/components/TableComponent.vue'
import { AD_CAMPAIGN_MANAGER_ABI } from '@/artifacts/abi/ad-campaign-manager'
const { addErrorToast, addSuccessToast } = useToastStore()
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
    executeGetAdminList()
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
    addErrorToast('Add admin failed')
  }
})

watch(errorGetAdminList, () => {
  if (errorGetAdminList.value) {
    addErrorToast('get Admin list failed')
  }
})

watch(errorRemoveAdmin, () => {
  if (errorRemoveAdmin.value) {
    addErrorToast('Remove admin failed')
  }
})

function handleAdminAction(adminAddress: string, action: string) {
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
