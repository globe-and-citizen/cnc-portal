<template>
  <span class="mb-4 text-xl font-semibold">Board Approval Required</span>
  <div class="flex-1 flex gap-4 p-4 mt-4 bg-white rounded-lg shadow-sm border border-gray-300">
    <div
      class="p-1 rounded-full aspect-square flex items-center justify-center w-12 h-12 bg-gray-200"
    >
      <IconifyIcon icon="heroicons:arrow-right" class="h-7 w-7 text-gray-600" />
    </div>
    <div>
      <p class="text-xl font-semibold text-gray-900">Ownership Transfer Request</p>
      <p class="text-gray-400">{{ row.description }}....</p>
    </div>
  </div>

  <div class="flex justify-end mt-2">
    <span class="text-lg font-bold text-gray-700"> 1/3 </span>
  </div>
  <progress class="progress progress-info mb-4" :value="25" :max="100"></progress>
  <div class="flex flex-col gap-2">
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
    <ButtonUI variant="error" @click="" data-test="cancel-button">
      <span><IconifyIcon icon="heroicons:arrow-left" /></span> Close
    </ButtonUI>
    <ButtonUI variant="primary" data-test="transfer-ownership-button"> Approve Action </ButtonUI>
  </div>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import type { TableRow } from '@/components/TableComponent.vue'
import { Icon as IconifyIcon } from '@iconify/vue'
import UserComponent from '@/components/UserComponent.vue'
import ButtonUI from '@/components/ButtonUI.vue'

defineProps<{ row: TableRow }>()

const approvals = ref([
  {
    id: 1,
    name: 'Alice',
    address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
    status: 'pending'
  },
  { id: 2, name: 'Bob', address: '0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0', status: 'approved' },
  {
    id: 3,
    name: 'Charlie',
    address: '0x5c69bEe701ef814a2B6a3E2f8e4F9b6c4d8f5e1',
    status: 'rejected'
  }
])
</script>
