<template>
  <h3 class="mb-4 text-lg font-bold">
    Contract Admin List {{ range }}
    <UIcon v-if="isLoading" name="i-lucide-loader-circle" class="h-5 w-5 animate-spin" />
  </h3>

  <!-- Inline form to add new admin -->
  <form
    @submit.prevent="handleAdminAction(newAdminAddress as `0x${string}`, 'addAdmin')"
    class="mb-4 flex items-center space-x-2"
  >
    <UInput
      v-model="newAdminAddress"
      type="text"
      size="sm"
      placeholder="Enter new admin address"
      class="w-full max-w-xs"
      :required="true"
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
    v-if="isLoading"
    class="bg-opacity-75 absolute inset-0 flex items-center justify-center bg-white"
  ></div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'

import { useReadContract } from '@wagmi/vue'
import { useContractWritesV3 } from '@/composables/contracts/useContractWritesV3'
import type { TeamContract } from '@/types'
import AddressToolTip from '@/components/AddressToolTip.vue'
import { AD_CAMPAIGN_MANAGER_ABI } from '@/artifacts/abi/ad-campaign-manager'
import type { Address } from 'viem'
const toast = useToast()

const props = defineProps<{
  contract: TeamContract
  range: number
}>()

const isLoading = computed(() => loadingRemoveAdmin.value || loadingAddAdmin.value)

// State for new admin address
const newAdminAddress = ref('')

const contractAddress = computed(() => (props.contract?.address || '') as Address)

const {
  mutate: addAdmin,
  error: errorAddAdmin,
  isPending: loadingAddAdmin
} = useContractWritesV3({
  contractAddress,
  abi: AD_CAMPAIGN_MANAGER_ABI,
  functionName: 'addAdmin'
})

const {
  mutate: removeAdmin,
  error: errorRemoveAdmin,
  isPending: loadingRemoveAdmin
} = useContractWritesV3({
  contractAddress,
  abi: AD_CAMPAIGN_MANAGER_ABI,
  functionName: 'removeAdmin'
})

const {
  data: admins,
  refetch: executeGetAdminList,
  error: errorGetAdminList
} = useReadContract({
  functionName: 'getAdminList',
  address: contractAddress,
  abi: AD_CAMPAIGN_MANAGER_ABI
})

const adminsList = computed<Address[]>(() => {
  return Array.isArray(admins.value) ? (admins.value as Address[]) : []
})

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
    removeAdmin(
      { args: [adminAddress] },
      {
        onSuccess: () => {
          toast.add({ title: 'Admin removed successfully', color: 'success' })
          executeGetAdminList()
        }
      }
    )
  } else {
    addAdmin(
      { args: [adminAddress] },
      {
        onSuccess: () => {
          toast.add({ title: 'Admin added successfully', color: 'success' })
          newAdminAddress.value = ''
          executeGetAdminList()
        }
      }
    )
  }
}
</script>
