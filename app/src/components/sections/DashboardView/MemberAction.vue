<template>
  <div class="flex flex-wrap gap-2">
    <ButtonUI
      variant="error"
      size="sm"
      @click="() => (showDeleteMemberConfirmModal = true)"
      data-test="delete-member-button"
    >
      <IconifyIcon icon="heroicons-outline:trash" class="size-4" />
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
      <hr class="my-2" />

      <div class="space-y-4 mt-3">
        <!-- Max Weekly Hours -->
        <div>
          <label class="input input-bordered flex items-center gap-2 input-md w-full">
            <span class="w-40">Max Weekly Hours</span>
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
            class="text-red-500 text-sm w-full text-left"
            v-for="error of v$.wageData.maxWeeklyHours?.$errors"
            :key="error.$uid"
          >
            {{ error.$message }}
          </div>
        </div>

        <!-- Hourly Rates - Horizontal Layout -->
        <div>
          <h3 class="font-medium mb-2">Hourly Rates</h3>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <!-- Native Token -->
            <div>
              <div class="join w-full">
                <input
                  type="text"
                  class="input input-bordered join-item w-full"
                  v-model="wageData.hourlyRate"
                  placeholder="Native token rate..."
                  data-test="hourly-rate-input"
                />
                <span class="join-item px-4 bg-primary text-primary-content flex items-center">
                  {{ NETWORK.currencySymbol }}
                </span>
              </div>
              <div
                data-test="hourly-rate-error"
                class="text-red-500 text-sm w-full text-left"
                v-for="error of v$.wageData.hourlyRate?.$errors"
                :key="error.$uid"
              >
                {{ error.$message }}
              </div>
            </div>

            <!-- USDC -->
            <div>
              <div class="join w-full">
                <input
                  type="text"
                  class="input input-bordered join-item w-full"
                  v-model="wageData.hourlyRateUsdc"
                  placeholder="USDC rate..."
                  data-test="hourly-rate-usdc-input"
                />
                <span class="join-item px-4 bg-primary text-primary-content flex items-center">
                  USDC
                </span>
              </div>
              <div
                data-test="hourly-rate-usdc-error"
                class="text-red-500 text-sm w-full text-left"
                v-for="error of v$.wageData.hourlyRateUsdc?.$errors"
                :key="error.$uid"
              >
                {{ error.$message }}
              </div>
            </div>

            <!-- SHER -->
            <div>
              <div class="join w-full">
                <input
                  type="text"
                  class="input input-bordered join-item w-full"
                  v-model="wageData.hourlyRateToken"
                  placeholder="SHER rate..."
                  data-test="hourly-rate-sher-input"
                />
                <span class="join-item px-4 bg-primary text-primary-content flex items-center">
                  SHER
                </span>
              </div>
              <div
                data-test="hourly-rate-sher-error"
                class="text-red-500 text-sm w-full text-left"
                v-for="error of v$.wageData.hourlyRateSher?.$errors"
                :key="error.$uid"
              >
                {{ error.$message }}
              </div>
            </div>
          </div>
        </div>

        <!-- Error Messages -->
        <div v-if="addMemberWageDataError" data-test="error-state">
          <div
            class="alert alert-warning"
            v-if="addMemberWageDataStatusCode === 403 || addMemberWageDataStatusCode === 404"
          >
            {{ addMemberWageDataError.message }}
          </div>
          <div class="alert" v-else>Error! Something went wrong</div>
        </div>

        <!-- Action Buttons -->
        <div class="modal-action justify-center">
          <ButtonUI
            :loading="isMemberWageSaving"
            :disabled="isMemberWageSaving"
            variant="success"
            @click="addMemberWageData"
            data-test="add-wage-button"
          >
            Save
          </ButtonUI>
          <ButtonUI
            variant="error"
            outline
            @click="
              () => {
                showSetMemberWageModal = false
                v$.$reset()
                wageData.maxWeeklyHours = 0
                wageData.hourlyRate = 0
              }
            "
            data-test="add-wage-cancel-button"
          >
            Cancel
          </ButtonUI>
        </div>
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
import { Icon as IconifyIcon } from '@iconify/vue'
import { useVuelidate } from '@vuelidate/core'
import { numeric, required, helpers } from '@vuelidate/validators'
import { computed, ref } from 'vue'
import { NETWORK } from '@/constant'
const teamStore = useTeamStore()
const { addSuccessToast } = useToastStore()

const props = defineProps<{
  member: Partial<Member>
  teamId: number | string
  // ownerAddress: string
}>()
const emits = defineEmits(['refetchWage'])

const showDeleteMemberConfirmModal = ref(false)
const showSetMemberWageModal = ref(false)
const wageData = ref({
  maxWeeklyHours: 0,
  hourlyRate: 0,
  hourlyRateUsdc: 0,
  hourlyRateToken: 0
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
  if (deleteMemberStatusCode.value === 204) {
    showDeleteMemberConfirmModal.value = false
    teamStore.fetchTeam(String(props.teamId))
  }
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
    tokenRatePerHour: wageData.value.hourlyRateToken,
    maximumHoursPerWeek: wageData.value.maxWeeklyHours,
    usdcRatePerHour: wageData.value.hourlyRateUsdc
    // sherRatePerHour: wageData.value.hourlyRateSher
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

    emits('refetchWage')
    showSetMemberWageModal.value = false
  }
}
</script>

<style scoped></style>
