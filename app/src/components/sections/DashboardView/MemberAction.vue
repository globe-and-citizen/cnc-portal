<template>
  <div class="flex flex-wrap gap-2">
    <ButtonUI
      variant="error"
      size="sm"
      @click="() => (showDeleteMemberConfirmModal = true)"
      data-test="delete-member-button"
    >
      <TrashIcon class="size-4" />
    </ButtonUI>
    <ButtonUI
      size="sm"
      variant="success"
      @click="() => (showSetMemberWageModal = true)"
      data-test="set-wage-button"
    >
      Set Wage
    </ButtonUI>

    <ModalComponent v-model="showDeleteMemberConfirmModal" v-if="showDeleteMemberConfirmModal">
      <p class="font-bold text-lg">Confirmation</p>
      <hr class="" />
      <p class="py-4">
        Are you sure you want to delete
        <span class="font-bold">{{ member.name }}</span>
        with address <span class="font-bold">{{ member.address }}</span>
        from the team?
      </p>

      <div v-if="deleteMemberError" data-test="error-state">
        <div class="alert alert-warning" v-if="deleteMemberStatusCode === 403">
          You don't have the permission to delete this member
        </div>
        <div class="alert" v-else>Error! Something went wrong</div>
      </div>
      <div class="modal-action justify-center">
        <ButtonUI
          :loading="memberIsDeleting"
          :disabled="memberIsDeleting"
          variant="error"
          @click="deleteMember()"
          data-test="delete-member-confirm-button"
          >Delete</ButtonUI
        >
        <ButtonUI
          variant="primary"
          outline
          @click="showDeleteMemberConfirmModal = false"
          data-test="delete-member-cancel-button"
        >
          Cancel
        </ButtonUI>
      </div>
    </ModalComponent>

    <ModalComponent v-model="showSetMemberWageModal" v-if="showSetMemberWageModal">
      <p class="font-bold text-lg">Set Member Wage</p>
      <hr class="" />
      <div class="input-group mt-3">
        <label class="input input-bordered flex items-center gap-2 input-md">
          <span class="w-32">Max Weekly Hours</span>
          |
          <input
            type="text"
            class="grow"
            v-model="wageData.maxWeeklyHours"
            placeholder="Enter max hours per week..."
            data-test="max-hours-input"
          />
        </label>
        <div
          data-test="max-weekly-hours-error"
          class="pl-4 text-red-500 text-sm w-full text-left"
          v-for="error of v$.maxWeeklyHours?.$errors"
          :key="error.$uid"
        >
          {{ error.$message }}
        </div>
        <label class="input input-bordered flex items-center gap-2 input-md mt-2">
          <span class="w-32">Hourly Rate</span>
          |
          <input
            type="text"
            class="grow"
            v-model="wageData.hourlyRate"
            placeholder="Enter hourly rate..."
            data-test="hourly-rate-input"
          />
          | {{ `${NETWORK.currencySymbol} ` }}
        </label>
        <div
          data-test="hourly-rate-error"
          class="pl-4 text-red-500 text-sm w-full text-left"
          v-for="error of v$.hourlyRate?.$errors"
          :key="error.$uid"
        >
          {{ error.$message }}
        </div>
      </div>
      <div v-if="addMemberWageDataError" data-test="error-state">
        <div class="alert alert-warning" v-if="addMemberWageDataStatusCode === 403">
          {{ addMemberWageDataError.message }}
        </div>
        <div v-else-if="addMemberWageDataStatusCode === 404">
          {{ addMemberWageDataError.message }}
        </div>
        <div class="alert" v-else>Error! Something went wrong</div>
      </div>
      <div class="modal-action justify-center">
        <ButtonUI
          :loading="isMemberWageSaving"
          :disabled="isMemberWageSaving"
          variant="success"
          @click="addMemberWageData"
          data-test="add-wage-button"
          >Save</ButtonUI
        >
        <ButtonUI variant="error" outline @click="showSetMemberWageModal = false">Cancel</ButtonUI>
      </div>
    </ModalComponent>
  </div>
</template>

<script setup lang="ts">
import ButtonUI from '@/components/ButtonUI.vue'
import ModalComponent from '@/components/ModalComponent.vue'
import { useCustomFetch } from '@/composables'
import { useTeamStore, useToastStore } from '@/stores'
import type { Member } from '@/types'
import { TrashIcon } from '@heroicons/vue/24/outline'
import { NETWORK } from '@/constant'
import { useVuelidate } from '@vuelidate/core'
import { numeric, required, helpers } from '@vuelidate/validators'
import { computed, ref, watch } from 'vue'
const teamStore = useTeamStore()
const { addSuccessToast } = useToastStore()

const props = defineProps<{
  member: Partial<Member>
  teamId: number | string
  // ownerAddress: string
}>()

const showDeleteMemberConfirmModal = ref(false)
const showSetMemberWageModal = ref(false)
const wageData = ref({
  maxWeeklyHours: 0,
  hourlyRate: 0
})
const notZero = helpers.withMessage('Amount must be greater than 0', (value: string) => {
  return parseFloat(value) > 0
})

const rules = {
  wageData: {
    maxWeeklyHours: {
      required,
      numeric,
      notZero
    },
    hourlyRate: {
      required: true,
      numeric: true,
      notZero
    }
  }
}
const v$ = useVuelidate(rules, { wageData })

// useFetch instance for deleting member
const {
  error: deleteMemberError,
  isFetching: memberIsDeleting,
  statusCode: deleteMemberStatusCode,
  execute: executeDeleteMember
} = useCustomFetch(
  computed(() => `teams/${props.teamId}/member/${props.member.address}`),
  {
    immediate: false
  }
)
  .delete()
  .json()

const deleteMember = async (): Promise<void> => {
  await executeDeleteMember()
  console.log('Deleting member...')
  if (deleteMemberStatusCode.value === 204) {
    addSuccessToast('Member deleted successfully')
    showDeleteMemberConfirmModal.value = false
    teamStore.fetchTeam(String(props.teamId))
    console.log('Member deleted successfully', showDeleteMemberConfirmModal.value)
  }
  console.log('Delete member finished')
}
const {
  error: addMemberWageDataError,
  isFetching: isMemberWageSaving,
  statusCode: addMemberWageDataStatusCode,
  execute: addMemberWageDataAPI
} = useCustomFetch('/wage/setWage', {
  immediate: false
})
  .put(() => ({
    teamId: props.teamId,
    userAddress: props.member.address,
    cashRatePerHour: wageData.value.hourlyRate,
    tokenRatePerHour: wageData.value.hourlyRate,
    maximumHoursPerWeek: wageData.value.maxWeeklyHours
  }))
  .json()

const addMemberWageData = async () => {
  v$.value.$touch()
  if (v$.value.$invalid) {
    return
  }
  await addMemberWageDataAPI()
  if (addMemberWageDataStatusCode.value === 201) {
    addSuccessToast('Member wage data set successfully')

    // TODO: instead of fetching the team again, we can update the team wage data in the store
    teamStore.fetchTeam(String(props.teamId))
    showSetMemberWageModal.value = false
  }
}
</script>

<style scoped></style>
