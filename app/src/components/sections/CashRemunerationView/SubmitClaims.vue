<template>
  <ButtonUI
    :loading="isWageClaimAdding"
    variant="success"
    data-test="modal-submit-hours-button"
    @click="modal = true"
  >
    Submit Claim
  </ButtonUI>
  <ModalComponent v-model="modal">
    <div class="flex flex-col gap-4">
      <h3 class="text-xl font-bold">Submit Claim</h3>
      <hr />
      <label class="input input-bordered flex items-center gap-2 input-md">
        <span class="w-full" data-test="hours-worked-label">Input hours work</span>
        <input
          type="text"
          class="grow"
          data-test="hours-worked-input"
          placeholder="10"
          v-model="hoursWorked.hoursWorked"
        />
      </label>

      <textarea
        type="text"
        class="grow w-full textarea input-bordered flex items-start"
        data-test="what-did-you-do-textarea-input"
        placeholder="I worked on the ...."
        v-model="hoursWorked.description"
      >
      </textarea>

      <div
        class="pl-4 text-red-500 text-sm"
        v-for="error of v$.hoursWorked.hoursWorked.$errors"
        :key="error.$uid"
        data-test="hours-worked-error"
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
          @click="async () => await addWageClaim()"
          >Submit</ButtonUI
        >
      </div>
    </div>
  </ModalComponent>
</template>
<script setup lang="ts">
import ButtonUI from '@/components/ButtonUI.vue'
import { computed, ref, watch } from 'vue'
import { useVuelidate } from '@vuelidate/core'
import { minValue, numeric, required } from '@vuelidate/validators'
import { useCustomFetch } from '@/composables/useCustomFetch'
import { useTeamStore, useToastStore } from '@/stores'
import ModalComponent from '@/components/ModalComponent.vue'

const toastStore = useToastStore()
const teamStore = useTeamStore()
const hoursWorked = ref<{ hoursWorked: string | undefined }>({
  hoursWorked: undefined,
  description: undefined
})
const modal = ref(false)
const emits = defineEmits(['refetchClaims'])

const rules = {
  hoursWorked: {
    hoursWorked: {
      required,
      numeric,
      minValue: minValue(1)
    }
  },
  description: {
    required
  }
}
const v$ = useVuelidate(rules, { hoursWorked })
const teamId = computed(() => teamStore.currentTeam?.id)
const {
  error: addWageClaimError,
  isFetching: isWageClaimAdding,
  execute: addWageClaimAPI,
  statusCode: addWageClaimStatusCode
} = useCustomFetch('/claim', {
  immediate: false
})
  .post(() => ({
    teamId: teamId.value,
    hoursWorked: hoursWorked.value.hoursWorked,
    description: hoursWorked.value.description
  }))
  .json()

watch(addWageClaimStatusCode, async () => {
  if (addWageClaimStatusCode.value === 201) {
    modal.value = false
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
