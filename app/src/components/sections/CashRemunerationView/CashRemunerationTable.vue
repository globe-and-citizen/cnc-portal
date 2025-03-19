<template>
  <div class="overflow-x-auto flex flex-col gap-4 card bg-white p-6">
    <div class="w-full flex justify-between">
      <span class="font-bold text-lg">Claims Table</span>
      <SubmitClaims @refetch-claims="async () => await fetchTeamClaimData()" />
    </div>
    <div class="form-control flex flex-row gap-4">
      <label class="label cursor-pointer flex gap-2" :key="status" v-for="status in statusses">
        <span class="label-text">{{ status.charAt(0).toUpperCase() + status.slice(1) }}</span>
        <input
          type="radio"
          :name="status"
          :data-test="`radio-${status}`"
          class="radio checked:bg-primary"
          :checked="selectedRadio === status"
          @change="() => (selectedRadio = status)"
        />
      </label>
    </div>
    <div class="bg-bae-100 w-full">
      <TableComponent
        :rows="teamClaimData ?? undefined"
        :columns="columns"
        :loading="isTeamClaimDataFetching"
      >
        <template #createdAt-data="{ row }">
          <span>{{ new Date(row.createdAt).toLocaleDateString() }}</span>
        </template>
        <template #action-data="{ row }">
          <ButtonUI
            v-if="row.status == 'pending' && ownerAddress == userDataStore.address"
            variant="success"
            data-test="approve-button"
            :loading="loadingApprove[row.id]"
            @click="async () => await approveClaim(row)"
            >Approve</ButtonUI
          >
          <!-- <ButtonUI
          v-if="row.status == 'approved' && ownerAddress == userDataStore.address"
          variant="error"
          data-test="disable-button"
          @click="() => {}"
          >Disable</ButtonUI
        > -->
          <!-- <ButtonUI
          v-if="row.status == 'disabled'"
          variant="info"
          data-test="enable-button"
          @click="() => {}"
          >Enable</ButtonUI
        > -->
          <ButtonUI
            v-if="row.status == 'approved'"
            :disabled="userDataStore.address != row.address"
            :loading="withdrawLoading[row.id]"
            variant="warning"
            data-test="withdraw-button"
            @click="async () => await withdrawClaim(row.id as number)"
            >Withdraw</ButtonUI
          >
        </template>
        <template #member-data="{ row }">
          <UserComponent v-if="!!row.wage.user" :user="row.wage.user"></UserComponent>
        </template>
        <template #hoursWorked-data="{ row }">
          <span class="font-bold"> {{ row.hoursWorked }} h </span> <br />
          <span>{{ row.wage.maximumHoursPerWeek }} h/week</span>
        </template>
        <template #hourlyRate-data="{ row }">
          <span class="font-bold"> $ {{ row.wage.cashRatePerHour }}</span>
        </template>
        <template #status-data="{ row }">
          <span
            class="badge"
            :class="{
              'badge-info': row.status === 'pending',
              'badge-outline': row.status === 'approved',
              'bg-error': row.status === 'disabled',
              'bg-neutral text-white': row.status === 'withdrawn'
            }"
            >{{
              row.status == 'pending'
                ? 'Submitted'
                : row.status.charAt(0).toUpperCase() + row.status.slice(1)
            }}</span
          >
        </template>
      </TableComponent>
    </div>
  </div>
</template>

<script setup lang="ts">
import ButtonUI from '@/components/ButtonUI.vue'
import TableComponent, { type TableColumn } from '@/components/TableComponent.vue'
import { useSignWageClaim, useWithdrawClaim } from '@/composables/useClaim'
import { useCustomFetch } from '@/composables/useCustomFetch'
import { useTeamStore, useToastStore, useUserDataStore } from '@/stores'
import type { ClaimResponse } from '@/types'
import { log } from '@/utils'
import type { Address } from 'viem'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import SubmitClaims from './SubmitClaims.vue'
import UserComponent from '@/components/UserComponent.vue'

defineProps<{
  ownerAddress: string | undefined
}>()
const route = useRoute()
const userDataStore = useUserDataStore()
const toastStore = useToastStore()
const teamStore = useTeamStore()
const statusses = ['all', 'pending', 'approved', 'withdrawn']
const selectedRadio = ref('all')

const teamId = computed(() => teamStore.currentTeam?.id)
const teamIsLoading = computed(() => teamStore.currentTeamMeta?.teamIsFetching)

const {
  data: teamClaimData,
  isFetching: isTeamClaimDataFetching,
  error: teamClaimDataError,
  execute: fetchTeamClaimData
} = useCustomFetch(
  computed(() => `/claim/?teamId=${teamId.value}`),
  { immediate: false }
).json<Array<ClaimResponse>>()

// Watch team ID update to fetch the team wage data
watch(
  [teamId, teamIsLoading],
  async ([newTeamId, newIsloading], [oldTeamId, oldIsLoading]) => {
    // TODO: i leave this here to explain how the watch on team reload works
    console.log('Test')
    console.log('teamId', oldTeamId, newTeamId)
    console.log('isLoading', oldIsLoading, newIsloading)
    if (newTeamId && !newIsloading) await fetchTeamClaimData()

    if (teamClaimDataError.value) {
      toastStore.addErrorToast('Failed to fetch team wage data')
    }
  },
  { immediate: true }
)


const approvalData = ref<{
  signature: Address | undefined
  id: number
}>({ signature: undefined, id: 0 })
const loadingApprove = ref<{ [key: number]: boolean }>({})
const withdrawLoading = ref<{ [key: number]: boolean }>({})
const selectedWithdrawClaim = ref<number | undefined>(undefined)

const { signature, execute: signClaim } = useSignWageClaim()
const {
  execute: executeWithdrawClaim,
  isLoading: withdrawClaimLoading,
  isSuccess: withdrawClaimSuccess
} = useWithdrawClaim()

const approveClaim = async (claim: ClaimResponse) => {
  loadingApprove.value[claim.id] = true

  await signClaim(claim)
  approvalData.value = {
    id: claim.id,
    signature: signature.value
  }

  await addApprovalAPI()

  await fetchTeamClaimData()
  loadingApprove.value[claim.id] = false
}

const withdrawClaim = async (id: number) => {
  selectedWithdrawClaim.value = id

  await executeWithdrawClaim(id)
}

const {
  error: addApprovalError,
  execute: addApprovalAPI,
  statusCode: addApprovalStatusCode
} = useCustomFetch(`teams/${String(route.params.id)}/cash-remuneration/claim/employer`, {
  immediate: false
})
  .put(approvalData)
  .json()

// const {
//   data: claims,
//   error: claimsError,
//   isFetching: claimsLoading,
//   execute: fetchClaims
// } = useCustomFetch(claimsUrl).get().json<ClaimResponse[]>()

// watch(claimsError, (newVal) => {
//   if (newVal) {
//     log.error(newVal)
//     toastStore.addErrorToast('Failed to fetch claims')
//   }
// })
watch(addApprovalStatusCode, async (newVal) => {
  if (newVal == 200) {
    toastStore.addSuccessToast('Claim approved successfully')
  }
})
watch(addApprovalError, (newVal) => {
  if (newVal) {
    toastStore.addErrorToast(addApprovalError.value)
  }
})
watch(selectedRadio, async () => {
  // await fetchClaims()
})
watch(withdrawClaimLoading, (newVal) => {
  withdrawLoading.value[selectedWithdrawClaim.value!] = newVal
})
watch(withdrawClaimSuccess, async (newVal) => {
  if (newVal) {
    // await fetchClaims()
  }
})

// onMounted(async () => {
//   await fetchClaims()
// })

const columns = [
  {
    key: 'createdAt',
    label: 'Date',
    sortable: true,
    class: 'text-black text-base'
  },
  {
    key: 'member',
    label: 'Member',
    sortable: false,
    class: 'text-black text-base'
  },
  {
    key: 'hoursWorked',
    label: 'Hour',
    sortable: false,
    class: 'text-black text-base'
  },
  {
    key: 'hourlyRate',
    label: 'Rate',
    sortable: false,
    class: 'text-black text-base'
  },
  {
    key: 'status',
    label: 'Status',
    class: 'text-black text-base'
  },
  {
    key: 'action',
    label: 'Action',
    sortable: false,
    class: 'text-black text-base'
  }
] as TableColumn[]
</script>
