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

    <ModalComponent v-model="showDeleteMemberConfirmModal">
      <p class="font-bold text-lg">Confirmation</p>
      <hr class="" />
      <p class="py-4">
        Are you sure you want to delete
        <span class="font-bold">{{ member.name }}</span>
        with address <span class="font-bold">{{ member.address }}</span>
        from the team?
      </p>

      <div v-if="deleteMemberError" data-test="error-state">
        <div class="alert alert-warning" v-if="deleteMemberStatusCode === 401">
          You don't have the permission to delete this member
        </div>
        <div class="alert" v-else>Error! Something went wrong</div>
      </div>
      <div class="modal-action justify-center">
        <ButtonUI
          :loading="memberIsDeleting"
          :disabled="memberIsDeleting"
          variant="error"
          @click="executeDeleteMember()"
          data-test="delete-member-confirm-button"
          >Delete</ButtonUI
        >
        <ButtonUI variant="primary" outline @click="showDeleteMemberConfirmModal = false">
          Cancel
        </ButtonUI>
      </div>
    </ModalComponent>

    <ModalComponent v-model="showSetMemberWageModal">
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
        <div class="alert alert-warning" v-if="addMemberWageDataStatusCode === 401">
          You don't have the permission to set wage for this member
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
import { useToastStore } from '@/stores'
import type { Member } from '@/types'
import { TrashIcon } from '@heroicons/vue/24/outline'
import { NETWORK } from '@/constant'
import { useVuelidate } from '@vuelidate/core'
import { numeric, required, helpers } from '@vuelidate/validators'
import { ref, watch } from 'vue'
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
} = useCustomFetch(`teams/${String(props.teamId)}/member`, {
  immediate: false,
  beforeFetch: async ({ options, url, cancel }) => {
    options.headers = {
      memberaddress: props.member.address ? props.member.address : '',
      'Content-Type': 'application/json',
      ...options.headers
    }
    return { options, url, cancel }
  }
})
  .delete()
  .json()

const {
  error: addMemberWageDataError,
  isFetching: isMemberWageSaving,
  statusCode: addMemberWageDataStatusCode,
  execute: addMemberWageDataAPI
} = useCustomFetch(`teams/${String(props.teamId)}/member/${props.member.address}/setWage`)
  .put(wageData)
  .json()

watch(deleteMemberStatusCode, () => {
  if (deleteMemberStatusCode.value === 204) {
    addSuccessToast('Member deleted successfully')
    showDeleteMemberConfirmModal.value = false
  }
})

watch(addMemberWageDataStatusCode, () => {
  if (addMemberWageDataStatusCode.value === 200) {
    addSuccessToast('Member wage data set successfully')
    showSetMemberWageModal.value = false
  }
})
const addMemberWageData = async () => {
  v$.value.$touch()
  if (v$.value.$invalid) {
    return
  }
  await addMemberWageDataAPI()
}
</script>

<style scoped></style>
