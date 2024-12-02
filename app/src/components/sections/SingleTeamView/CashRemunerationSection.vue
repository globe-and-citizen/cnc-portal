<template>
  <div class="flex flex-col gap-y-4 py-6 lg:px-4 sm:px-6">
    <div class="flex justify-between">
      <span class="text-2xl sm:text-3xl font-bold">Pending Claims</span>
      <div class="flex gap-2">
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
        <!--<button class="btn btn-success">Submit Hours</button>-->
        <ButtonUI
          v-if="isSubmittingHours"
          loading
          variant="success"
          data-test="submitting-hours-button"
        />
        <ButtonUI v-else variant="success" data-test="submit-hours-button" @click="addWageClaim"
          >Submit Hours</ButtonUI
        >
      </div>
    </div>
    <div class="divider m-0"></div>
    <div class="overflow-x-auto" v-if="wageClaims">
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
          <tr v-for="data in wageClaims as ClaimResponse[]" :key="data.id">
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
              <button class="btn btn-success" @click="approveClaim(data)">Approve</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span>Cash Remuneration Balance</span>
          <div class="font-extrabold text-4xl">
            <span class="inline-block min-w-16 h-10">
              <span class="loading loading-spinner loading-lg" v-if="balanceLoading"></span>
              <span v-else>{{ cashRemunerationBalance?.formatted }} </span>
            </span>
            <span class="text-xs">{{ NETWORK.currencySymbol }}</span>
          </div>
          <span class="text-xs sm:text-sm">≈ $ 1.28</span>
        </div>
        <div class="flex flex-wrap gap-2 sm:gap-4">
          <span class="text-sm">Cash Remuneration Address </span>
          <AddressToolTip :address="team.cashRemunerationEip712Address ?? ''" class="text-xs" />
        </div>
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
import { EthersJsAdapter } from '@/adapters/web3LibraryAdapter'
import { log, parseError } from '@/utils'
import { parseEther, type Address } from 'viem'
import { useBalance } from '@wagmi/vue'
import { NETWORK } from '@/constant'
import AddressToolTip from '@/components/AddressToolTip.vue'

const route = useRoute()
const web3Library = new EthersJsAdapter()

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

const {
  data: cashRemunerationBalance,
  isLoading: balanceLoading,
  error: balanceError,
  refetch: fetchBalance
} = useBalance({
  address: props.team.cashRemunerationEip712Address as `${Address}`
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
} = useCustomFetch(`teams/${String(route.params.id)}/cash-remuneration/claim/pending`)
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

const approveClaim = async (claim: ClaimResponse) => {
  loadingApprove.value = true
  const provider = await web3Library.getProvider()
  const signer = await web3Library.getSigner()
  const chainId = (await provider.getNetwork()).chainId
  const verifyingContract = team.value.cashRemunerationEip712Address

  const domain = {
    name: 'CashRemuneration',
    version: '1',
    chainId,
    verifyingContract
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
    employeeAddress: claim.address,
    date: Math.floor(new Date(claim.createdAt).getTime() / 1000)
  }

  try {
    const signature = await signer.signTypedData(domain, types, data)
    approvalData.value = {
      id: claim.id,
      signature
    }
    await addApprovalAPI()
    await getWageClaimsAPI()
  } catch (err) {
    log.error(parseError(err))
    addErrorToast(parseError(err))
  } finally {
    loadingApprove.value = false
  }
}

onMounted(async () => {
  await getWageClaimsAPI()
  await fetchBalance()
})
</script>
