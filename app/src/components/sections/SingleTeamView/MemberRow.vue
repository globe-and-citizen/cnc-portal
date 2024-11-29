<template>
  <tr>
    <th>{{ member.index ?? '' }}</th>
    <td>{{ member.name }}</td>
    <td>
      <AddressToolTip :address="member.address ?? ''" />
    </td>
    <td class="relative w-1/4" v-if="ownerAddress === userDataStore.address">
      <div
        v-if="member.address != ownerAddress && ownerAddress == userDataStore.address"
        class="flex flex-wrap gap-2"
      >
        <button
          class="btn btn-error btn-sm"
          @click="() => (showDeleteMemberConfirmModal = true)"
          data-test="delete-member-button"
        >
          <TrashIcon class="size-4" />
        </button>
        <button
          class="btn btn-sm btn-success"
          @click="() => (showSetMemberWageModal = true)"
          data-test="set-wage-button"
        >
          Set Wage
        </button>
      </div>
    </td>
  </tr>
  <div>
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
          @click="deleteMemberAPI()"
          data-test="delete-member-confirm-button"
          >Delete</ButtonUI
        >
        <ButtonUI variant="primary" @click="showDeleteMemberConfirmModal = false">
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
            v-model="maxWeeklyHours"
            placeholder="Enter max hours per week..."
            data-test="max-hours-input"
          />
        </label>
        <label class="input input-bordered flex items-center gap-2 input-md mt-2">
          <span class="w-32">Hourly Rate</span>
          |
          <input type="text" class="grow" v-model="hourlyRate" placeholder="Enter hourly rate..." />
          | {{ `${NETWORK.currencySymbol} ` }}
        </label>
      </div>
      <div class="modal-action justify-center">
        <ButtonUI v-if="isMemberWageSaving" loading variant="success" />
        <ButtonUI
          v-else
          variant="success"
          @click="addMemberWageData"
          data-test="delete-member-confirm-button"
          >Save</ButtonUI
        >
        <ButtonUI variant="error" @click="showSetMemberWageModal = false"> Cancel </ButtonUI>
      </div>
    </ModalComponent>
  </div>
</template>
<script setup lang="ts">
import { useUserDataStore } from '@/stores/user'
import { TrashIcon } from '@heroicons/vue/24/outline'
import ModalComponent from '@/components/ModalComponent.vue'
import { useRoute } from 'vue-router'
import type { MemberInput } from '@/types'
import { ref, watch } from 'vue'
import { useToastStore } from '@/stores/useToastStore'
import { useCustomFetch } from '@/composables/useCustomFetch'
import AddressToolTip from '@/components/AddressToolTip.vue'
import ButtonUI from '@/components/ButtonUI.vue'
import { NETWORK } from '@/constant'

interface Member extends MemberInput {
  index: number
}
const props = defineProps<{
  member: Partial<Member>
  teamId: Number
  ownerAddress: String
}>()
const { addSuccessToast, addErrorToast } = useToastStore()
const userDataStore = useUserDataStore()
const route = useRoute()

const emits = defineEmits(['getTeam'])

const member = ref(props.member)
const showDeleteMemberConfirmModal = ref(false)
const showSetMemberWageModal = ref(false)
const maxWeeklyHours = ref('0')
const hourlyRate = ref('0')
const wageData = ref<{ maxHoursPerWeek: number; hourlyRate: number } | {}>({})

// useFetch instance for deleting member
const {
  error: deleteMemberError,
  isFetching: memberIsDeleting,
  execute: deleteMemberAPI
} = useCustomFetch(`teams/${String(route.params.id)}/member`, {
  immediate: false,
  beforeFetch: async ({ options, url, cancel }) => {
    options.headers = {
      memberaddress: member.value.address ? member.value.address : '',
      'Content-Type': 'application/json',
      ...options.headers
    }
    return { options, url, cancel }
  }
})
  .delete()
  .json()
// Watchers for deNETWORKleting member
watch([() => memberIsDeleting.value, () => deleteMemberError.value], async () => {
  if (!memberIsDeleting.value && !deleteMemberError.value) {
    addSuccessToast('Member deleted successfully')
    showDeleteMemberConfirmModal.value = false
    emits('getTeam')
  }
})
watch(deleteMemberError, () => {
  if (deleteMemberError.value) {
    addErrorToast(deleteMemberError.value)
    showDeleteMemberConfirmModal.value = false
  }
})

const {
  error: addMemberWageDataError,
  isFetching: isMemberWageSaving,
  execute: addMemberWageDataAPI
} = useCustomFetch(`teams/${String(route.params.id)}/cash-remuneration/wage`, {
  immediate: false,
  beforeFetch: async ({ options, url, cancel }) => {
    options.headers = {
      memberaddress: member.value.address ? member.value.address : '',
      'Content-Type': 'application/json',
      ...options.headers
    }
    return { options, url, cancel }
  }
})
  .post(wageData)
  .json()
watch(addMemberWageDataError, (newVal) => {
  if (newVal) {
    addErrorToast(addMemberWageDataError.value)
    showSetMemberWageModal.value = false
  }
})

const addMemberWageData = async () => {
  wageData.value = {
    maxHoursPerWeek: Number(maxWeeklyHours.value),
    hourlyRate: Number(hourlyRate.value)
  }
  console.log(`wageData`, wageData.value)
  await addMemberWageDataAPI()
}
</script>
