<template>
  <div class="flex flex-col gap-y-4 py-6 lg:px-4 sm:px-6">
    <!-- TODO move it to the top of the page when cash remuneration will have his own page -->
    <!-- Cash Remuneration stats: Only apear for owner -->

    <CashRemunerationStats></CashRemunerationStats>
    <div class="flex flex-col sm:flex-row justify-end items-start sm:items-center gap-4">
      <div class="flex flex-wrap gap-2 sm:gap-4">
        <span class="text-sm">Cash Remuneration Address </span>
        <AddressToolTip :address="team.cashRemunerationEip712Address ?? ''" class="text-xs" />
      </div>
    </div>
    <div class="divider m-0"></div>
    <div class="flex justify-between">
      <span class="text-2xl sm:text-3xl font-bold">Submit Claims</span>
      <div class="flex gap-2">
        <div>
          <label class="input input-bordered flex items-center gap-2 input-md">
            <span class="w-24">Hours Worked</span>
            |
            <input
              type="text"
              class="grow"
              v-model="hoursWorked.hoursWorked"
              placeholder="Enter hours worked..."
              data-test="hours-worked-input"
            />
          </label>

          <div
            data-test="hours-worked-error"
            class="pl-4 text-red-500 text-sm w-full text-left"
            v-for="error of v$.hoursWorked.$errors"
            :key="error.$uid"
          >
            {{ error.$message }}
          </div>
        </div>
        <!--<button class="btn btn-success">Submit Hours</button>-->
        <ButtonUI
          :loading="isSubmittingHours"
          variant="success"
          data-test="submit-hours-button"
          @click="addWageClaim"
        >
          Submit Hours
        </ButtonUI>
      </div>
    </div>
    <div class="divider m-0"></div>
    <div class="overflow-x-auto flex flex-col gap-4" v-if="wageClaims" data-test="claims-table">
      <span class="text-2xl sm:text-3xl font-bold">Claims Table</span>

      <TabNavigation v-model="activeTab" :tabs="tabs" class="w-full">
        <template #tab-0> Tab 1 </template>
        <template #tab-1> Tab 2 </template>
        <template #tab-2> Tab 3 </template>
        <template #tab-3> Tab 4 </template>
        <template #tab-4> Tab 4 </template>
      </TabNavigation>
      <table class="table table-zebra">
        <!-- head -->
        <thead class="text-sm font-bold">
          <tr>
            <th>Date</th>
            <th>Name</th>
            <th>Address</th>
            <th>Hours</th>
            <th>Rate</th>
            <th v-if="team.ownerAddress === currentUserAddress" data-test="action-th">Action</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="data in wageClaims" :key="data.id">
            <td>{{ new Date(data.createdAt).toLocaleDateString() }}</td>
            <td>{{ data.name }}</td>
            <td>{{ data.address }}</td>
            <td>{{ data.hoursWorked }}</td>
            <td>{{ data.hourlyRate }}</td>
            <td
              v-if="team.ownerAddress === currentUserAddress"
              class="flex justify-end"
              data-test="action-td"
            >
              <ButtonUI variant="success" @click="approveClaim(data)">Approve</ButtonUI>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useUserDataStore } from '@/stores'
import ButtonUI from '@/components/ButtonUI.vue'
import type { Team, WageClaim, ClaimResponse } from '@/types'
import { onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useCustomFetch } from '@/composables/useCustomFetch'
import { useToastStore } from '@/stores'
import { log, parseError } from '@/utils'
import { parseEther, type Address } from 'viem'
import { useBalance, useChainId, useSignTypedData } from '@wagmi/vue'
import AddressToolTip from '@/components/AddressToolTip.vue'
import { useVuelidate } from '@vuelidate/core'
import { numeric, required } from '@vuelidate/validators'
import CashRemunerationStats from './CashRemunerationStats.vue'
import TabNavigation from '@/components/TabNavigation.vue'
const route = useRoute()

const { addErrorToast, addSuccessToast } = useToastStore()
const props = defineProps<{ team: Partial<Team> }>()
const team = ref(props.team)
const currentUserAddress = useUserDataStore().address
const isSubmittingHours = ref(false)
const hoursWorked = ref<{ hoursWorked: string | undefined }>({ hoursWorked: undefined })
const approvalData = ref<{
  signature: string | undefined
  id: number
}>({ signature: undefined, id: 0 })
const loadingApprove = ref(false)

const tabs = ref(['Submited', 'Approved', 'Withdrawed', 'Disabled', 'Archived'])
const activeTab = ref(0)

const rules = {
  hoursWorked: {
    hoursWorked: {
      required,
      numeric
    }
  }
}
const v$ = useVuelidate(rules, { hoursWorked })

const {
  // data: cashRemunerationBalance,
  // isLoading: balanceLoading,
  error: balanceError,
  refetch: fetchBalance
} = useBalance({
  address: props.team.cashRemunerationEip712Address as `${Address}`
})
watch(balanceError, (newVal) => {
  if (newVal) {
    addErrorToast(parseError(newVal))
    log.error(parseError(newVal))
  }
})

//#region add wage claim
const {
  error: addWageClaimError,
  isFetching: isWageClaimAdding,
  execute: addWageClaimAPI
} = useCustomFetch(`teams/${String(route.params.id)}/cash-remuneration/claim`, {
  immediate: false
})
  .post(hoursWorked)
  .json()
//watchers for add wage claim
watch([() => isWageClaimAdding.value, () => addWageClaimError.value], async () => {
  if (!isWageClaimAdding.value && !addWageClaimError.value) {
    addSuccessToast('Wage claim added successfully')
  }
})
watch(addWageClaimError, (newVal) => {
  if (newVal) {
    addErrorToast(addWageClaimError.value)
  }
})

const addWageClaim = async () => {
  v$.value.$touch()
  if (v$.value.$invalid) {
    return
  }
  await addWageClaimAPI()
  await getWageClaimsAPI()
}
//#endregion add wage claim

//#region get wage claims
const {
  error: getWageClaimsError,
  // isFetching: isWageClaimsFetching,
  execute: getWageClaimsAPI,
  data: wageClaims
} = useCustomFetch<ClaimResponse[]>(
  `teams/${String(route.params.id)}/cash-remuneration/claim/pending`
)
  .get()
  .json()
// watch(wageClaims, async (newVal) => {
//   if (newVal) {
//     addSuccessToast('Wage claims fetched successfully')
//   }
// })
watch(getWageClaimsError, (newVal) => {
  if (newVal) {
    addErrorToast(getWageClaimsError.value)
  }
})
//#endregion get wage claims

//#region approve wage claims
const {
  error: addApprovalError,
  isFetching: isApprovalAdding,
  execute: addApprovalAPI
} = useCustomFetch(`teams/${String(route.params.id)}/cash-remuneration/claim/employer`, {
  immediate: false
})
  .put(approvalData)
  .json()
watch([() => isApprovalAdding.value, () => addApprovalError.value], async (newVal) => {
  if (newVal) {
    addSuccessToast('Claim approved successfully')
  }
})
watch(addApprovalError, (newVal) => {
  if (newVal) {
    addErrorToast(addApprovalError.value)
  }
})

const chainId = useChainId()
const claimData = ref<ClaimResponse | null>(null)
const { signTypedData, data } = useSignTypedData()

watch( data, async (newVal) => {
  if (newVal && claimData.value) {
    approvalData.value = {
      id: claimData.value.id,
      signature: newVal
    }

    await addApprovalAPI()
    await getWageClaimsAPI()
  }
})

const approveClaim = async (claim: ClaimResponse) => {
  loadingApprove.value = true
  claimData.value = claim
  const verifyingContract = team.value.cashRemunerationEip712Address

  const domain = {
    name: 'CashRemuneration',
    version: '1',
    chainId: chainId.value,
    verifyingContract: verifyingContract as Address
  }

  const types = {
    WageClaim: [
      { name: 'employeeAddress', type: 'address' },
      { name: 'hoursWorked', type: 'uint8' },
      { name: 'hourlyRate', type: 'uint256' },
      { name: 'date', type: 'uint256' }
    ]
  }

  const data: WageClaim = {
    hourlyRate: parseEther(claim.hourlyRate),
    hoursWorked: claim.hoursWorked,
    employeeAddress: claim.address as Address,
    date: Math.floor(new Date(claim.createdAt).getTime() / 1000)
  }

  signTypedData({
    types, 
    primaryType: 'WageClaim', 
    message: data as unknown as Record<string, unknown>, 
    domain
  })
}

onMounted(async () => {
  await getWageClaimsAPI()
  await fetchBalance()
})
</script>
