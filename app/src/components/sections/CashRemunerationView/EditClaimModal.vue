<template>
  <ModalComponent v-model="showModal">
    <div class="flex flex-col gap-4 mb-20">
      <h3 class="text-xl font-bold">Edit Claim</h3>
      <hr />
      <div class="flex flex-col gap-2">
        <label class="flex items-center">
          <span class="w-full" data-test="hours-worked-label">Date</span>
        </label>
        <VueDatePicker
          v-model="editedClaim.dayWorked"
          model-type="iso"
          :format="formatUTC"
          :enable-time-picker="false"
          auto-apply
          class="input input-bordered input-md"
          data-test="date-input"
          utc="preserve"
        />
      </div>
      <div class="flex flex-col gap-2">
        <label class="flex items-center">
          <span class="w-full">Hours worked</span>
        </label>
        <input
          type="text"
          class="input input-bordered input-md grow"
          data-test="hours-worked-input"
          placeholder="10"
          v-model="editedClaim.hoursWorked"
        />
        <div
          class="pl-4 text-red-500 text-sm"
          v-for="error of v$.editedClaim.hoursWorked.$errors"
          :key="error.$uid"
          data-test="hours-worked-error"
        >
          {{ error.$message }}
        </div>
      </div>
      <div class="flex flex-col gap-2">
        <label class="flex items-center">
          <span class="w-full">Memo</span>
        </label>
        <textarea
          class="textarea input-bordered"
          placeholder="I worked on..."
          data-test="memo-input"
          v-model="editedClaim.memo"
        ></textarea>
      </div>
      <div
        class="pl-4 text-red-500 text-sm"
        v-for="error of v$.editedClaim.memo.$errors"
        :key="error.$uid"
      >
        {{ error.$message }}
      </div>

      <div class="flex justify-center gap-4">
        <ButtonUI
          variant="error"
          class="w-32"
          :disabled="isUpdating"
          data-test="cancel-edit-button"
          @click="closeModal"
        >
          Cancel
        </ButtonUI>
        <ButtonUI
          variant="success"
          class="w-32"
          :disabled="isUpdating"
          :loading="isUpdating"
          data-test="update-claim-button"
          @click="updateClaim"
        >
          Update
        </ButtonUI>
      </div>
    </div>
  </ModalComponent>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useVuelidate } from '@vuelidate/core'
import { required, numeric, minValue, maxValue, maxLength } from '@vuelidate/validators'
import { useCustomFetch } from '@/composables/useCustomFetch'
import { useToastStore, useTeamStore } from '@/stores'
import { useQueryClient } from '@tanstack/vue-query'
import type { Claim } from '@/types'
import dayjs from 'dayjs'
import ButtonUI from '@/components/ButtonUI.vue'
import ModalComponent from '@/components/ModalComponent.vue'

const props = defineProps<{
  claim: Claim
  teamId: number | string
}>()

const emit = defineEmits<{
  close: []
  weekChange: [weekStart: string]
}>()

const showModal = ref(true)
const toastStore = useToastStore()
const queryClient = useQueryClient()

const editedClaim = ref({
  hoursWorked: String(props.claim.hoursWorked),
  memo: props.claim.memo,
  dayWorked: props.claim.dayWorked
})

const rules = {
  editedClaim: {
    hoursWorked: { required, numeric, minValue: minValue(1), maxValue: maxValue(24) },
    memo: { required, maxLength: maxLength(200) },
    dayWorked: { required }
  }
}

const v$ = useVuelidate(rules, { editedClaim })

const { execute: updateClaimRequest, isFetching: isUpdating } = useCustomFetch(
  `/claim/${props.claim.id}/details`,
  {
    immediate: false
  }
)
  .put(() => ({
    hoursWorked: Number(editedClaim.value.hoursWorked),
    memo: editedClaim.value.memo,
    dayWorked: editedClaim.value.dayWorked
  }))
  .json()

const formatUTC = (value: Date | string | null | undefined) => {
  if (!value) return ''
  if (value instanceof Date) {
    const year = value.getFullYear()
    const month = value.getMonth()
    const day = value.getDate()
    return dayjs.utc(Date.UTC(year, month, day)).format('YYYY-MM-DD [UTC]')
  }
  return dayjs.utc(value).format('YYYY-MM-DD [UTC]')
}

const closeModal = () => {
  showModal.value = false
  emit('close')
}

const updateClaim = async () => {
  v$.value.$touch()
  if (v$.value.$invalid) return

  try {
    const oldWeekStart = dayjs(props.claim.dayWorked).utc().startOf('isoWeek').toISOString()
    const newWeekStart = dayjs(editedClaim.value.dayWorked).utc().startOf('isoWeek').toISOString()

    await updateClaimRequest()
    toastStore.addSuccessToast('Claim updated successfully')

    // Invalidate queries for both old and new weeks
    await queryClient.invalidateQueries({
      queryKey: ['weekly-claims', props.teamId]
    })

    // If week changed, select the new week
    if (oldWeekStart !== newWeekStart) {
      emit('weekChange', newWeekStart)
    }

    closeModal()
  } catch (error: any) {
    toastStore.addErrorToast(error.message || 'Failed to update claim')
  }
}

watch(showModal, (newVal) => {
  if (!newVal) {
    emit('close')
  }
})
</script>
