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
            :disabled="team.ownerAddress === currentUserAddress"
          />
        </label>
        <!--<button class="btn btn-success">Submit Hours</button>-->
        <ButtonUI v-if="isSubmittingHours" loading variant="success" data-test="submitting-hours-button"/>
        <ButtonUI 
          v-else variant="success" 
          data-test="submit-hours-button" 
          :disabled="team.ownerAddress === currentUserAddress"
          @click="addWageClaim"
        >Submit Hours</ButtonUI>
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
              <button class="btn btn-success">Approve</button>
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
import type { Team } from '@/types'
import { onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useCustomFetch } from '@/composables/useCustomFetch'
import { useToastStore } from '@/stores'


const route = useRoute()

const { addErrorToast, addSuccessToast } = useToastStore()
const currentUserAddress = useUserDataStore().address
const isSubmittingHours = ref(false)
const hoursWorked = ref<{hoursWorked: string | undefined}>({hoursWorked: undefined})
const dummyData = ref([{ name: 'Member', address: '0x123', hoursWorked: 20, hourlyRate: 50 }])

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
}

const {
  error: getWageClaimsError,
  isFetching: isWageClaimsFetching,
  execute: getWageClaimsAPI,
  data: wageClaims
} = useCustomFetch(`teams/${String(route.params.id)}/cash-remuneration/claim/pending`)
  .get()
  .json()
watch(wageClaims, async (newVal) => {
  if (newVal) {
    addSuccessToast('Wage claims fetched successfully')
  }
})
watch(getWageClaimsError, (newVal) => {
  if (newVal) {
    addErrorToast(getWageClaimsError.value)
  }
})
const props = defineProps<{ team: Partial<Team> }>()

onMounted(async () => {
  await getWageClaimsAPI()
  console.log(`wageClaims`, wageClaims.value)
})
</script>
