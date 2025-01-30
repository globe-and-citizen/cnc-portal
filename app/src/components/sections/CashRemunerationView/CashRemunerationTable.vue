<template>
  <div class="form-control flex flex-row gap-4">
    <label class="label cursor-pointer flex gap-2" :key="status" v-for="status in statusses">
      <span class="label-text">{{ status.charAt(0).toUpperCase() + status.slice(1) }}</span>
      <input
        type="radio"
        name="pending"
        class="radio checked:bg-primary"
        :checked="selectedRadio === status"
        @change="() => (selectedRadio = status)"
      />
    </label>
  </div>
  <div class="card bg-base-100 w-full shadow-xl">
    <TableComponent :rows="claims ?? undefined" :columns="columns" :loading="claimsLoading">
      <template #action-data="{ row }">
        <ButtonUI
          v-if="row.status == 'Pending'"
          variant="success"
          data-test="approve-button"
          @click="() => {}"
          >Approve</ButtonUI
        >
        <ButtonUI
          v-if="row.status == 'Approved'"
          variant="error"
          data-test="disable-button"
          @click="() => {}"
          >Disable</ButtonUI
        >
        <ButtonUI
          v-if="row.status == 'Disabled'"
          variant="info"
          data-test="enable-button"
          @click="() => {}"
          >Enable</ButtonUI
        >
      </template>
      <template #member-data="{ row }">
        <div class="flex w-full gap-2">
          <div class="w-8 sm:w-10">
            <img
              alt="User avatar"
              class="rounded-full"
              src="https://img.daisyui.com/images/stock/photo-1534528741775-53994a69daeb.webp"
            />
          </div>
          <div class="flex flex-col text-gray-600">
            <p class="font-bold text-sm line-clamp-1" data-test="user-name">{{ row.name }}</p>
            <p class="text-sm" data-test="formatted-address">
              {{ row.address?.slice(0, 6) }}...{{ row.address?.slice(-6) }}
            </p>
          </div>
        </div>
      </template>
      <template #hourlyRate-data="{ row }">
        <span> ${{ row.hourlyRate }}</span>
      </template>
      <template #status-data="{ row }">
        <span
          class="badge"
          :class="{
            'badge-info': row.status === 'Pending',
            'badge-outline': row.status === 'Approved',
            'bg-error': row.status === 'Disabled',
            'bg-neutral text-white': row.status === 'Withdrawn'
          }"
          >{{ row.status == 'Pending' ? 'Submitted' : row.status }}</span
        >
      </template>
    </TableComponent>
  </div>
</template>

<script setup lang="ts">
import ButtonUI from '@/components/ButtonUI.vue'
import TableComponent, { type TableColumn } from '@/components/TableComponent.vue'
import { useCustomFetch } from '@/composables/useCustomFetch'
import { useToastStore } from '@/stores'
import type { ClaimResponse } from '@/types'
import { log } from '@/utils'
import { computed, ref, watch } from 'vue'

const { addErrorToast } = useToastStore()
const props = defineProps<{
  teamId: number
}>()
const statusses = ['all', 'pending', 'approved', 'disabled', 'withdrawn']
const selectedRadio = ref('all')
const claimsUrl = computed(
  () => `/teams/${props.teamId}/cash-remuneration/claim/${selectedRadio.value}`
)
const {
  data: claims,
  error: claimsError,
  isFetching: claimsLoading,
  execute: fetchClaims
} = useCustomFetch(claimsUrl).get().json<ClaimResponse[]>()

watch(selectedRadio, async () => {
  await fetchClaims()
})

watch(claimsError, (newVal) => {
  if (newVal) {
    log.error(newVal)
    addErrorToast('Failed to fetch claims')
  }
})

// const claims = [
//   {
//     id: 1,
//     name: 'Lindsay Walton',
//     img: 'https://randomuser.me/api/portraits',
//     address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
//     hourlyRate: '10',
//     hoursWorked: 10,
//     status: 'Pending',
//     createdAt: new Date().toLocaleDateString()
//   },
//   {
//     id: 2,
//     name: 'Courtney Henry',
//     img: 'https://randomuser.me/api/portraits',
//     address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
//     hourlyRate: '10',
//     hoursWorked: 10,
//     status: 'Approved',
//     createdAt: new Date().toLocaleDateString()
//   },
//   {
//     id: 3,
//     name: 'Tom Cook',
//     img: 'https://randomuser.me/api/portraits',
//     address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
//     hourlyRate: '10',
//     hoursWorked: 10,
//     status: 'Disabled',
//     createdAt: new Date().toLocaleDateString()
//   },
//   {
//     id: 4,
//     name: 'Whitney Francis',
//     img: 'https://randomuser.me/api/portraits',
//     address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
//     hourlyRate: '10',
//     hoursWorked: 10,
//     status: 'Pending',
//     createdAt: new Date().toLocaleDateString()
//   },
//   {
//     id: 5,
//     name: 'Leonard Krasner',
//     img: 'https://randomuser.me/api/portraits',
//     address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
//     hourlyRate: '10',
//     hoursWorked: 10,
//     status: 'Withdrawn',
//     createdAt: new Date().toLocaleDateString()
//   }
// ]

const columns = [
  {
    key: 'createdAt',
    label: 'Date',
    sortable: true
  },
  {
    key: 'member',
    label: 'Member',
    sortable: false
  },
  {
    key: 'hoursWorked',
    label: 'Hour',
    sortable: false
  },
  {
    key: 'hourlyRate',
    label: 'Rate',
    sortable: false
  },
  {
    key: 'status',
    label: 'Status'
  },
  {
    key: 'action',
    label: 'Action',
    sortable: false
  }
] as TableColumn[]
</script>
