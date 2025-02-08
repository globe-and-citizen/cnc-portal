<template>
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
      <ButtonUI
        :loading="isWageClaimAdding"
        variant="success"
        data-test="submit-hours-button"
        @click="async () => await addWageClaim()"
      >
        Submit Hours
      </ButtonUI>
    </div>
  </div>
</template>
<script setup lang="ts">
import ButtonUI from '@/components/ButtonUI.vue'
import { ref, watch } from 'vue'
import { useVuelidate } from '@vuelidate/core'
import { numeric, required } from '@vuelidate/validators'
import { useCustomFetch } from '@/composables/useCustomFetch'
import { useRoute } from 'vue-router'
import { useToastStore } from '@/stores'

const route = useRoute()
const toastStore = useToastStore()
const hoursWorked = ref<{ hoursWorked: string | undefined }>({ hoursWorked: undefined })
const emits = defineEmits(['refetchClaims'])

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
  error: addWageClaimError,
  isFetching: isWageClaimAdding,
  execute: addWageClaimAPI,
  statusCode: addWageClaimStatusCode
} = useCustomFetch(`teams/${String(route.params.id)}/cash-remuneration/claim`, {
  immediate: false
})
  .post(hoursWorked)
  .json()

watch(addWageClaimStatusCode, async () => {
  if (addWageClaimStatusCode.value === 201) {
    toastStore.addSuccessToast('Wage claim added successfully')
  }
})
watch(addWageClaimError, (newVal) => {
  if (newVal) {
    toastStore.addErrorToast(addWageClaimError.value)
  }
})

const addWageClaim = async () => {
  v$.value.$touch()
  if (v$.value.$invalid) {
    return
  }
  await addWageClaimAPI()
  emits('refetchClaims')
}
</script>
