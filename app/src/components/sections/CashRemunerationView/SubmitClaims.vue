<template>
  <ButtonUI
    :loading="isWageClaimAdding"
    variant="success"
    data-test="modal-submit-hours-button"
    size="sm"
    @click="openModal"
  >
    Submit Claim
  </ButtonUI>

  <ModalComponent v-model="modal">
    <div class="flex flex-col gap-4 mb-20">
      <h3 class="text-xl font-bold">Submit Claim</h3>
      <hr />
      <div class="flex flex-col gap-2">
        <label class="flex items-center">
          <span class="w-full" data-test="hours-worked-label">Date</span>
        </label>
        <VueDatePicker
          v-model="hoursWorked.dayWorked"
          model-type="iso"
          :format="formatUTC"
          :enable-time-picker="false"
          auto-apply
          class="input input-bordered input-md"
          data-test="date-input"
          utc="preserve"
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
        <div
          class="pl-4 text-red-500 text-sm"
          v-for="error of v$.hoursWorked.hoursWorked.$errors"
          :key="error.$uid"
          data-test="hours-worked-error"
        >
          {{ error.$message }}
        </div>
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
      <div v-if="addWageClaimError && errorMessage" class="mt-4">
        <div role="alert" class="alert alert-error">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-6 w-6 shrink-0 stroke-current"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>{{ errorMessage.message }}</span>
        </div>
      </div>
    </div>
  </ModalComponent>
</template>

<script setup lang="ts">
import ButtonUI from '@/components/ButtonUI.vue'
import ModalComponent from '@/components/ModalComponent.vue'
import { ref, computed, watch } from 'vue'
import { useVuelidate } from '@vuelidate/core'
import { required, numeric, minValue, maxValue } from '@vuelidate/validators'
import { useCustomFetch } from '@/composables/useCustomFetch'
import { useToastStore, useTeamStore } from '@/stores'
import { maxLength } from '@vuelidate/validators'
import { useQueryClient } from '@tanstack/vue-query'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'

const toastStore = useToastStore()
const teamStore = useTeamStore()
const queryClient = useQueryClient()

dayjs.extend(utc)

const modal = ref(false)
const hoursWorked = ref<{
  hoursWorked: string | undefined
  memo: string | undefined
  dayWorked: string | undefined
}>({
  hoursWorked: undefined,
  memo: undefined,
  dayWorked: dayjs().utc().format('YYYY-MM-DD') // Store as simple date string.utc().startOf('day').toISOString() // Default to today's date
})

const openModal = () => {
  modal.value = true
}

const rules = {
  hoursWorked: {
    hoursWorked: {
      required,
      numeric,
      minValue: minValue(1),
      maxValue: maxValue(24)
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
  response: addWageClaimResponse,
  statusCode: addWageClaimStatusCode
} = useCustomFetch('/claim', {
  immediate: false
})
  .post(() => ({
    teamId: teamId.value,
    ...hoursWorked.value
  }))
  .json()

const errorMessage = ref<{ message: string } | null>(null)

// Ensure the date picker displays the date in UTC in the input and preview
// Accepts Date or string as some pickers may pass a Date instance to the formatter
const formatUTC = (value: Date | string | null | undefined) => {
  if (!value) return ''
  console.log(`Date: ${value}`)
  // dayjs handles both Date and ISO string inputs
  // return dayjs(value).utc().format('YYYY-MM-DD [UTC]')
  // If it's a Date object, convert it to UTC by extracting the UTC components
  // If it's a Date object, convert it to UTC by extracting the local date components
  console.log('ISO String: ', value instanceof Date ? value.toISOString() : value)
  if (value instanceof Date) {
    // Extract the LOCAL date components (what the user actually selected)
    const year = value.getFullYear()
    const month = value.getMonth()
    const day = value.getDate()

    // Create a UTC date using those components
    return dayjs.utc(Date.UTC(year, month, day)).format('YYYY-MM-DD [UTC]')
  }
  // console.log('ISO String: ', isoString)
  return dayjs.utc(value).format('YYYY-MM-DD [UTC]')
}

watch(addWageClaimError, async () => {
  if (addWageClaimError.value) {
    errorMessage.value = await addWageClaimResponse.value?.json()
  }
})

const addWageClaim = async () => {
  console.log('hoursWorked.value.dayWorked: ', hoursWorked.value.dayWorked)
  v$.value.$touch()
  if (v$.value.$invalid) return

  await addClaim()

  if (addWageClaimStatusCode.value === 201) {
    toastStore.addSuccessToast('Wage claim added successfully')
    queryClient.invalidateQueries({
      queryKey: ['weekly-claims', teamStore.currentTeam?.id]
    })
    modal.value = false

    // 🔁 Reset fields and validation after success
    hoursWorked.value.hoursWorked = undefined
    hoursWorked.value.memo = undefined
    v$.value.$reset()
  }
  // else if (addWageClaimError.value) {
  //   toastStore.addErrorToast(addWageClaimError.value)
  // }
}
</script>
