<template>
  <div class="flex flex-col gap-y-4 py-6 lg:px-4 sm:px-6">
    <div class="flex gap-10">
      <CashRemunerationCard cardType="balance" :amount="1000" />
      <CashRemunerationCard cardType="month-claims" :amount="500" />
      <CashRemunerationCard cardType="approved-claims" :amount="50" />
    </div>
    <div class="flex flex-col sm:flex-row justify-end items-start sm:items-center gap-4">
      <div class="flex flex-wrap gap-2 sm:gap-4">
        <span class="text-sm">Cash Remuneration Address </span>
        <AddressToolTip :address="team?.cashRemunerationEip712Address ?? ''" class="text-xs" />
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

          <!-- <div
            data-test="hours-worked-error"
            class="pl-4 text-red-500 text-sm w-full text-left"
            v-for="error of v$.hoursWorked.$errors"
            :key="error.$uid"
          >
            {{ error.$message }}
          </div> -->
        </div>
        <!--<button class="btn btn-success">Submit Hours</button>-->
        <ButtonUI
          :loading="isSubmittingHours"
          variant="success"
          data-test="submit-hours-button"
          @click="() => {}"
        >
          Submit Hours
        </ButtonUI>
      </div>
    </div>
    <div class="divider m-0"></div>
    <div class="overflow-x-auto flex flex-col gap-4" data-test="claims-table">
      <span class="text-2xl sm:text-3xl font-bold">Claims Table</span>
      <CashRemunerationTable v-if="team?.id" :team-id="Number(team?.id)" />
    </div>
  </div>
</template>

<script setup lang="ts">
import ButtonUI from '@/components/ButtonUI.vue'
import type { Team } from '@/types'
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCustomFetch } from '@/composables/useCustomFetch'
import { useToastStore } from '@/stores'
import { log, parseError } from '@/utils'
import AddressToolTip from '@/components/AddressToolTip.vue'
// import { useVuelidate } from '@vuelidate/core'
// import { numeric, required } from '@vuelidate/validators'
import CashRemunerationCard from '@/components/sections/CashRemunerationView/CashRemunerationCard.vue'
import CashRemunerationTable from '@/components/sections/CashRemunerationView/CashRemunerationTable.vue'

const router = useRouter()
const route = useRoute()
const { addErrorToast } = useToastStore()
const isSubmittingHours = ref(false)
const hoursWorked = ref<{ hoursWorked: string | undefined }>({ hoursWorked: undefined })
// const approvalData = ref<{
//   signature: string | undefined
//   id: number
// }>({ signature: undefined, id: 0 })
// const loadingApprove = ref(false)

// const rules = {
//   hoursWorked: {
//     hoursWorked: {
//       required,
//       numeric
//     }
//   }
// }
// const v$ = useVuelidate(rules, { hoursWorked })

const { data: team, error: teamError } = useCustomFetch(`teams/${String(route.params.id)}`)
  .get()
  .json<Team>()

watch(teamError, (newVal) => {
  if (newVal) {
    addErrorToast(parseError(newVal))
    log.error(parseError(newVal))

    router.push({ name: 'teams' })
  }
})

// const {
//   error: addWageClaimError,
//   isFetching: isWageClaimAdding,
//   execute: addWageClaimAPI
// } = useCustomFetch(`teams/${String(route.params.id)}/cash-remuneration/claim`, {
//   immediate: false
// })
//   .post(hoursWorked)
//   .json()
// //watchers for add wage claim
// watch([() => isWageClaimAdding.value, () => addWageClaimError.value], async () => {
//   if (!isWageClaimAdding.value && !addWageClaimError.value) {
//     addSuccessToast('Wage claim added successfully')
//   }
// })
// watch(addWageClaimError, (newVal) => {
//   if (newVal) {
//     addErrorToast(addWageClaimError.value)
//   }
// })

// const addWageClaim = async () => {
//   v$.value.$touch()
//   if (v$.value.$invalid) {
//     return
//   }
//   await addWageClaimAPI()
// }
//#endregion add wage claim

// //#region approve wage claims
// const {
//   error: addApprovalError,
//   isFetching: isApprovalAdding
//   // execute: addApprovalAPI
// } = useCustomFetch(`teams/${String(route.params.id)}/cash-remuneration/claim/employer`, {
//   immediate: false
// })
//   .put(approvalData)
//   .json()
// watch([() => isApprovalAdding.value, () => addApprovalError.value], async (newVal) => {
//   if (newVal) {
//     addSuccessToast('Claim approved successfully')
//   }
// })
// watch(addApprovalError, (newVal) => {
//   if (newVal) {
//     addErrorToast(addApprovalError.value)
//   }
// })

// const approveClaim = async (claim: ClaimResponse) => {
//   loadingApprove.value = true
//   const provider = await web3Library.getProvider()
//   const signer = await web3Library.getSigner()
//   const chainId = (await provider.getNetwork()).chainId
//   const verifyingContract = team.value?.cashRemunerationEip712Address

//   const domain = {
//     name: 'CashRemuneration',
//     version: '1',
//     chainId,
//     verifyingContract
//   }

//   const types = {
//     WageClaim: [
//       { name: 'employeeAddress', type: 'address' },
//       { name: 'hoursWorked', type: 'uint8' },
//       { name: 'hourlyRate', type: 'uint256' },
//       { name: 'date', type: 'uint256' }
//     ]
//   }

//   const data: WageClaim = {
//     hourlyRate: parseEther(claim.hourlyRate),
//     hoursWorked: claim.hoursWorked,
//     employeeAddress: claim.address,
//     date: Math.floor(new Date(claim.createdAt).getTime() / 1000)
//   }

//   try {
//     const signature = await signer.signTypedData(domain, types, data)
//     approvalData.value = {
//       id: claim.id,
//       signature
//     }
//     await addApprovalAPI()
//     await getWageClaimsAPI()
//   } catch (err) {
//     log.error(parseError(err))
//     addErrorToast(parseError(err))
//   } finally {
//     loadingApprove.value = false
//   }
// }
</script>
