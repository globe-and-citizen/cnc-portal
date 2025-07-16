```
<template>
  <ButtonUI
    :loading="isWageClaimAdding"
    variant="success"
    data-test="modal-submit-hours-button"
    @click="openModal"
  >
    Submit Claim
  </ButtonUI>

  <ModalComponent v-model="modal">
    <div class="flex flex-col gap-4">
      <h3 class="text-xl font-bold">Submit Claim</h3>
      <hr />
      <div class="flex flex-col gap-2">
        <label class="flex items-center">
          <span class="w-full" data-test="hours-worked-label">Date</span>
        </label>
        <VueDatePicker
          v-model="hoursWorked.dayWorked"
          class="input input-bordered input-md"
          data-test="date-input"
        />
        <!-- <VueDatePicker
          v-model="hoursWorked.dayWorked"
          :allowed-dates="allowedDates"
          class="input input-bordered input-md"
          data-test="date-input"
          disable-month-year-select
          :month-change-on-scroll="false"
          :enable-time-picker="false"
        /> -->
      </div>
      <div class="flex flex-col gap-2">
        <label class="flex items-center">
          <span class="w-full" data-test="hours-worked-label">Hours worked</span>
        </label>
        <input
          type="text"
          class="input input-bordered input-md grow"
          data-test="hours-worked-input"
          placeholder="10"
          v-model="hoursWorked.hoursWorked"
        />
      </div>
      <div class="flex flex-col gap-2">
        <label class="flex items-center">
          <span class="w-full" data-test="hours-worked-label">Memo</span>
        </label>
        <textarea
          class="textarea input-bordered"
          placeholder="I worked on the ...."
          data-test="memo-input"
          v-model="hoursWorked.memo"
        ></textarea>
      </div>

      <div
        class="pl-4 text-red-500 text-sm"
        v-for="error of v$.hoursWorked.hoursWorked.$errors"
        :key="error.$uid"
        data-test="hours-worked-error"
      >
        {{ error.$message }}
      </div>

      <div
        class="pl-4 text-red-500 text-sm"
        v-for="error of v$.hoursWorked.memo.$errors"
        :key="error.$uid"
        data-test="memo-worked-error"
      >
        {{ error.$message }}
      </div>

      <div class="flex justify-center">
        <ButtonUI
          variant="success"
          class="w-32"
          :disabled="isWageClaimAdding"
          :loading="isWageClaimAdding"
          data-test="submit-claim-button"
          @click="addWageClaim"
        >
          Submit
        </ButtonUI>
      </div>
    </div>
  </ModalComponent>
</template>

<script setup lang="ts">
import ButtonUI from '@/components/ButtonUI.vue'
import ModalComponent from '@/components/ModalComponent.vue'
import { ref, computed } from 'vue'
import { useVuelidate } from '@vuelidate/core'
import { required, numeric, minValue } from '@vuelidate/validators'
import { useCustomFetch } from '@/composables/useCustomFetch'
import { useToastStore, useTeamStore, useUserDataStore } from '@/stores'
import { maxLength } from '@vuelidate/validators'
import { useQueryClient } from '@tanstack/vue-query'

const toastStore = useToastStore()
const teamStore = useTeamStore()
const queryClient = useQueryClient()
const userStore = useUserDataStore()

const modal = ref(false)
const hoursWorked = ref<{
  hoursWorked: string | undefined
  memo: string | undefined
  dayWorked: string | undefined
}>({
  hoursWorked: undefined,
  memo: undefined,
  dayWorked: new Date().toISOString().split('T')[0] // Default to today's date
})

// TODO: enable this to restrict date selection to the current week
// const allowedDates = computed(() => {
//   const today = new Date()
//   const dayOfWeek = today.getDay() === 0 ? 7 : today.getDay() // Make Sunday = 7
//   const monday = new Date(today)
//   monday.setDate(today.getDate() - (dayOfWeek - 1))
//   const days = []
//   for (let d = new Date(monday); d <= today; d.setDate(d.getDate() + 1)) {
//     days.push(new Date(d))
//   }
//   return days
// })

const openModal = () => {
  modal.value = true
}

const rules = {
  hoursWorked: {
    hoursWorked: {
      required,
      numeric,
      minValue: minValue(1)
    },
    memo: {
      required,
      maxLength: maxLength(200)
    },
    dayWorked: {
      required
    }
  }
}
const v$ = useVuelidate(rules, { hoursWorked })

const teamId = computed(() => teamStore.currentTeam?.id)

const {
  error: addWageClaimError,
  isFetching: isWageClaimAdding,
  execute: addClaim,
  statusCode: addWageClaimStatusCode
} = useCustomFetch('/claim', { immediate: false })
  .post(() => ({
    teamId: teamId.value,
    ...hoursWorked.value
  }))
  .json()

const queryKey = computed(
  () => `pending-weekly-claims-${teamStore.currentTeam?.id}-${userStore.address}`
)

const addWageClaim = async () => {
  v$.value.$touch()
  if (v$.value.$invalid) return

  await addClaim()

  if (addWageClaimStatusCode.value === 201) {
    toastStore.addSuccessToast('Wage claim added successfully')
    queryClient.invalidateQueries({
      queryKey: [queryKey.value]
    })
    modal.value = false

    // 🔁 Reset champs et validation après succès
    hoursWorked.value.hoursWorked = undefined
    hoursWorked.value.memo = undefined
    v$.value.$reset()
  } else if (addWageClaimError.value) {
    toastStore.addErrorToast(addWageClaimError.value)
  }
}
</script>
``
