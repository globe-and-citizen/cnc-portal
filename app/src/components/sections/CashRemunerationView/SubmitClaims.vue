```<template>
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
        class="textarea input-bordered"
        placeholder="I worked on the ...."
        data-test="what-did-you-do-textarea-input"
        v-model="hoursWorked.description"
      ></textarea>

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
        v-for="error of v$.hoursWorked.description.$errors"
        :key="error.$uid"
        data-test="description-worked-error"
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
import { useToastStore, useTeamStore } from '@/stores'
import { maxLength } from '@vuelidate/validators'

const toastStore = useToastStore()
const teamStore = useTeamStore()
const emits = defineEmits(['refetchClaims'])

const modal = ref(false)
const hoursWorked = ref<{ hoursWorked: string | undefined; description: string | undefined }>({
  hoursWorked: undefined,
  description: undefined
})

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
    description: {
      required, 
      maxLength: maxLength(200)
    }
  }
}
const v$ = useVuelidate(rules, { hoursWorked })

const teamId = computed(() => teamStore.currentTeam?.id)

const {
  error: addWageClaimError,
  isFetching: isWageClaimAdding,
  execute: addWageClaimAPI,
  statusCode: addWageClaimStatusCode
} = useCustomFetch('/claim', { immediate: false })
  .post(() => ({
    teamId: teamId.value,
    hoursWorked: hoursWorked.value.hoursWorked,
    description: hoursWorked.value.description
  }))
  .json()

const addWageClaim = async () => {
  v$.value.$touch()
  if (v$.value.$invalid) return

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const res = await addWageClaimAPI()

  if (addWageClaimStatusCode.value === 201) {
    toastStore.addSuccessToast('Wage claim added successfully')
    emits('refetchClaims')
    modal.value = false

    // 🔁 Reset champs et validation après succès
    hoursWorked.value.hoursWorked = undefined
    hoursWorked.value.description = undefined
    v$.value.$reset()
  } else if (addWageClaimError.value) {
    toastStore.addErrorToast(addWageClaimError.value)
  }
}
</script>
``