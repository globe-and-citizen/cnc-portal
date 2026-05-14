<template>
  <span class="mb-4 text-xl font-semibold">Board Approval Required</span>
  <!-- BOD Action Details -->
  <div class="mt-4 flex flex-col gap-4 rounded-lg border border-gray-300 bg-white p-4 shadow-xs">
    <div class="flex items-center gap-3">
      <div
        class="flex aspect-square h-10 w-10 items-center justify-center rounded-full bg-gray-200 p-1"
      >
        <IconifyIcon icon="heroicons:arrow-right" class="h-5 w-5 text-gray-600" />
      </div>
      <div>
        <p class="text-xl font-semibold text-gray-900">{{ row.title }}</p>
      </div>
    </div>

    <BodApprovalDetails :row="row" :type="row.title" />
    <!-- <p v-else class="text-gray-400 font-semibold">{{ row.description }}</p> -->
  </div>

  <!-- Approval Progress -->
  <div class="mt-5 flex justify-between py-2">
    <span>Approval progress</span>
    <UBadge color="warning" variant="outline" class="font-semibold">
      {{ approvalCount.approved }}/{{ approvalCount.total }} Approvals
    </UBadge>
  </div>
  <progress
    class="progress progress-info mb-1"
    :value="approvalCount.approved"
    :max="approvalCount.total"
  ></progress>
  <span class="text-sm text-gray-500"
    >{{ Math.floor(approvalCount.total / 2) + 1 - approvalCount.approved }} Approval(s) left</span
  >

  <!-- Approvals List-->
  <div class="flex flex-col gap-2">
    <span class="mt-6">Board member approvals</span>
    <div
      v-for="approval in approvals"
      :key="approval.id"
      class="flex items-center justify-between gap-2 rounded-lg border border-gray-200 p-2"
    >
      <UserComponent :user="{ name: approval.name, address: approval.address }" />
      <UBadge
        :color="
          approval.status === 'approved'
            ? 'success'
            : approval.status === 'rejected'
              ? 'error'
              : 'warning'
        "
        variant="subtle"
      >
        {{ approval.status }}
      </UBadge>
    </div>
  </div>
  <div class="mt-6 flex justify-end gap-2">
    <UButton
      color="error"
      @click="$emit('close')"
      data-test="cancel-button"
      variant="ghost"
      leading-icon="heroicons:arrow-left"
      label="Close"
    />
    <UTooltip :text="hasApproved ? 'You have already approved' : 'Click to approve this action'">
      <UButton
        color="primary"
        data-test="transfer-ownership-button"
        @click="$emit('approve-action', row.actionId, row.id)"
        :loading="loading"
        :disabled="hasApproved || loading"
        label="Approve Action"
      />
    </UTooltip>
  </div>
</template>
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { TableRow } from '@/types/table'
import { Icon as IconifyIcon } from '@iconify/vue'
import UserComponent from '@/components/UserComponent.vue'
import { useReadContract } from '@wagmi/vue'
import { useTeamStore, useUserDataStore } from '@/stores'
import { BOD_ABI } from '@/artifacts/abi/bod'
import { log, parseError } from '@/utils'
import { readContract } from '@wagmi/core'
import { config } from '@/wagmi.config'
import type { Address } from 'viem'
import BodApprovalDetails from './BodApprovalDetails.vue'

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
        ? members.value.map(async (member: Address) => {
            const isApproved = await readContract(config, {
              address: bodAddress.value as Address,
              abi: BOD_ABI,
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
