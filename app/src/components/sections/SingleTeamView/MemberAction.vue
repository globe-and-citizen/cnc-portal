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
      <div class="modal-action justify-center">
        <ButtonUI v-if="memberIsDeleting" loading variant="error" />
        <ButtonUI
          v-else
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

    <!-- <ModalComponent v-model="showSetMemberWageModal">
      <p class="font-bold text-lg">Set Member Wage</p>
      <hr class="" />
      <div class="input-group mt-3">
        <label class="input input-bordered flex items-center gap-2 input-md">
          <span class="w-32">Max Weekly Hours</span>
          |
          <input
            type="text"
            class="grow"
            v-model="maxWeeklyHours"
            placeholder="Enter max hours per week..."
            data-test="max-hours-input"
          />
        </label>
        <div
          data-test="max-weekly-hours-error"
          class="pl-4 text-red-500 text-sm w-full text-left"
          v-for="error of v$.maxWeeklyHours.$errors"
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
            v-model="hourlyRate"
            placeholder="Enter hourly rate..."
            data-test="hourly-rate-input"
          />
          | {{ `${NETWORK.currencySymbol} ` }}
        </label>
        <div
          data-test="hourly-rate-error"
          class="pl-4 text-red-500 text-sm w-full text-left"
          v-for="error of v$.hourlyRate.$errors"
          :key="error.$uid"
        >
          {{ error.$message }}
        </div>
      </div>
      <div class="modal-action justify-center">
        <ButtonUI v-if="isMemberWageSaving" loading variant="success" />
        <ButtonUI v-else variant="success" @click="addMemberWageData" data-test="add-wage-button"
          >Save</ButtonUI
        >
        <ButtonUI variant="error" outline @click="showSetMemberWageModal = false">Cancel</ButtonUI>
      </div>
    </ModalComponent> -->
  </div>
</template>

<script setup lang="ts">
import ButtonUI from '@/components/ButtonUI.vue'
import ModalComponent from '@/components/ModalComponent.vue'
import { useCustomFetch } from '@/composables'
import { useToastStore } from '@/stores'
import type { Member } from '@/types'
import { TrashIcon } from '@heroicons/vue/24/outline'
import { ref, watch } from 'vue'
const { addErrorToast } = useToastStore()

const props = defineProps<{
  member: Partial<Member>
  teamId: number | string
  // ownerAddress: string
}>()

const showDeleteMemberConfirmModal = ref(false)
const showSetMemberWageModal = ref(false)

// useFetch instance for deleting member
const {
  error: deleteMemberError,
  isFetching: memberIsDeleting,
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

watch(deleteMemberError, () => {
  if (deleteMemberError.value) {
    addErrorToast(deleteMemberError.value)
    showDeleteMemberConfirmModal.value = false
  }
})
</script>

<style scoped></style>
