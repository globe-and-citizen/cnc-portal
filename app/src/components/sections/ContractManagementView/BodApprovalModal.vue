<template>
  <span class="mb-4 text-xl font-semibold">Board Approval Required</span>
  <div class="flex-1 flex gap-4 p-4 mt-4 bg-white rounded-lg shadow-sm border border-gray-300">
    <div
      class="p-1 rounded-full aspect-square flex items-center justify-center w-10 h-10 bg-gray-200"
    >
      <IconifyIcon icon="heroicons:arrow-right" class="h-5 w-5 text-gray-600" />
    </div>
    <div>
      <p class="text-xl font-semibold text-gray-900">{{ row.title }}</p>
      <p class="text-gray-400">{{ row.description }}</p>
    </div>
  </div>

  <!-- Approval Progress-->
  <div class="flex justify-between mt-5 py-2">
    <span>Approval progress</span>
    <span class="badge badge-warning badge-outline">
      {{ approvalCount.approved }}/{{ approvalCount.total }} Approvals
    </span>
  </div>
  <progress
    class="progress progress-info mb-1"
    :value="approvalCount.approved"
    :max="approvalCount.total"
  ></progress>
  <span class="text-sm text-gray-500">{{ (Math.floor(approvalCount.total/2)+1) - approvalCount.approved }} Approval(s) left</span>

  <!-- Approvals List-->
  <div class="flex flex-col gap-2">
    <span class="mt-6">Member Approvals</span>
    <div
      v-for="approval in approvals"
      :key="approval.id"
      class="flex justify-between items-center gap-2 p-2 rounded-lg border border-gray-200"
    >
      <UserComponent :user="{ name: approval.name, address: approval.address }" />
      <p
        class="badge"
        :class="{
          'badge-warning': approval.status === 'pending',
          'badge-success': approval.status === 'approved',
          'badge-error': approval.status === 'rejected'
        }"
      >
        {{ approval.status }}
      </p>
    </div>
  </div>
  <div class="flex mt-6 justify-end gap-2">
    <ButtonUI variant="error" @click="$emit('close')" data-test="cancel-button">
      <span><IconifyIcon icon="heroicons:arrow-left" /></span> Close
    </ButtonUI>
    <ToolTip :content="hasApproved ? 'You have already approved' : 'Click to approve this action'">
      <ButtonUI
        variant="primary"
        data-test="transfer-ownership-button"
        @click="$emit('approve-action', row.actionId, row.id)"
        :loading="loading"
        :disabled="hasApproved || loading"
      >
        Approve Action
      </ButtonUI>
    </ToolTip>
  </div>
</template>
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { TableRow } from '@/components/TableComponent.vue'
import { Icon as IconifyIcon } from '@iconify/vue'
import UserComponent from '@/components/UserComponent.vue'
import ButtonUI from '@/components/ButtonUI.vue'
import { useReadContract } from '@wagmi/vue'
import { useTeamStore, useUserDataStore } from '@/stores'
import BOD_ABI from '@/artifacts/abi/bod.json'
import { log, parseError } from '@/utils'
import { readContract } from '@wagmi/core'
import { config } from '@/wagmi.config'
import type { Abi, Address } from 'viem'
import ToolTip from '@/components/ToolTip.vue'

const props = defineProps<{ row: TableRow; loading: boolean }>()

defineEmits(['approve-action', 'close'])

const teamStore = useTeamStore()
const { address: currentAddress } = useUserDataStore()
const approvals = ref<{ id: string; name: string; address: string; status: string }[]>([])

const bodAddress = computed(() => teamStore.getContractAddressByType('BoardOfDirectors'))
const actionId = computed(() => props.row.actionId)
const approvalCount = computed(() => {
  return {
    approved: approvals.value.filter((a) => a.status === 'approved').length,
    total: approvals.value.length
  }
})
const hasApproved = computed(() => {
  return approvals.value.some((a) => a.address === currentAddress && a.status === 'approved')
})

const { data: members } = useReadContract({
  address: bodAddress,
  abi: BOD_ABI,
  functionName: 'getBoardOfDirectors'
})

const membersApprovals = async () => {
  try {
    return Promise.all(
      members.value && Array.isArray(members.value) && bodAddress.value
        ? members.value.map(async (member: string) => {
            const isApproved = await readContract(config, {
              address: bodAddress.value as Address,
              abi: BOD_ABI as Abi,
              functionName: 'isApproved',
              args: [actionId.value, member]
            })
            const userData = teamStore.currentTeam?.members.find((m) => m.address === member) || {
              name: 'Unknown',
              address: member
            }
            return {
              id: member,
              name: userData.name,
              address: userData.address,
              status: isApproved ? 'approved' : 'pending'
            }
          })
        : []
    )
  } catch (error) {
    log.error('Error fetching members approvals: ', parseError(error))
    return []
  }
}

watch(
  members,
  async (newMembers) => {
    if (newMembers) {
      approvals.value = await membersApprovals()
    }
  },
  { immediate: true }
)
</script>
