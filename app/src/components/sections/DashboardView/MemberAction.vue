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

        <!-- #region Multi Limit Inputs - Hourly Rates Vertical -->
        <div class="mb-4">
          <h3 class="text-lg font-semibold mb-4">Hourly Rates</h3>
          <div class="flex flex-col gap-6">
            <!-- Native Token -->
            <div class="flex items-center gap-4">
              <input
                type="checkbox"
                class="toggle toggle-info"
                v-model="wageData.nativeEnabled"
                :id="'toggle-native'"
                data-test="toggle-hourly-rate-native"
              />
              <div class="relative w-full">
                <input
                  :disabled="!wageData.nativeEnabled"
                  type="text"
                  class="input input-bordered w-full rounded-xl pr-16"
                  v-model="wageData.hourlyRate"
                  :placeholder="
                    wageData.nativeEnabled ? 'Native token rate...' : NETWORK.currencySymbol
                  "
                  data-test="hourly-rate-input"
                  style="min-width: 220px"
                />
                <span
                  class="badge absolute right-4 top-1/2 -translate-y-1/2"
                  :class="
                    wageData.nativeEnabled ? 'badge-primary font-bold' : 'badge-ghost text-gray-400'
                  "
                  style="transition: all 0.2s; pointer-events: none"
                >
                  {{ NETWORK.currencySymbol }}
                </span>
              </div>
            </div>
            <div
              data-test="hourly-rate-error"
              class="text-red-500 text-sm w-full text-left"
              v-for="error of v$.wageData.hourlyRate?.$errors"
              :key="error.$uid"
            >
              {{ error.$message }}
            </div>

            <!-- USDC -->
            <div class="flex items-center gap-4">
              <input
                type="checkbox"
                class="toggle toggle-info"
                v-model="wageData.usdcEnabled"
                :id="'toggle-usdc'"
                data-test="toggle-hourly-rate-usdc"
              />
              <div class="relative w-full">
                <input
                  :disabled="!wageData.usdcEnabled"
                  type="text"
                  class="input input-bordered w-full rounded-xl pr-16"
                  v-model="wageData.hourlyRateUsdc"
                  :placeholder="wageData.usdcEnabled ? 'USDC rate...' : 'USDC'"
                  data-test="hourly-rate-usdc-input"
                  style="min-width: 220px"
                />
                <span
                  class="badge absolute right-4 top-1/2 -translate-y-1/2"
                  :class="
                    wageData.usdcEnabled ? 'badge-primary font-bold' : 'badge-ghost text-gray-400'
                  "
                  style="transition: all 0.2s; pointer-events: none"
                >
                  USDC
                </span>
              </div>
            </div>
            <div
              data-test="hourly-rate-usdc-error"
              class="text-red-500 text-sm w-full text-left"
              v-for="error of v$.wageData.hourlyRateUsdc?.$errors"
              :key="error.$uid"
            >
              {{ error.$message }}
            </div>

            <!-- SHER -->
            <div class="flex items-center gap-4">
              <input
                type="checkbox"
                class="toggle toggle-info"
                v-model="wageData.sherEnabled"
                :id="'toggle-sher'"
                data-test="toggle-hourly-rate-sher"
              />
              <div class="relative w-full">
                <input
                  :disabled="!wageData.sherEnabled"
                  type="text"
                  class="input input-bordered w-full rounded-xl pr-16"
                  v-model="wageData.hourlyRateToken"
                  :placeholder="wageData.sherEnabled ? 'SHER rate...' : 'SHER'"
                  data-test="hourly-rate-sher-input"
                  style="min-width: 220px"
                />
                <span
                  class="badge absolute right-4 top-1/2 -translate-y-1/2"
                  :class="
                    wageData.sherEnabled ? 'badge-primary font-bold' : 'badge-ghost text-gray-400'
                  "
                  style="transition: all 0.2s; pointer-events: none"
                >
                  SHER
                </span>
              </div>
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

        <!-- Error Messages -->
        <div
          data-test="rate-per-hour-error"
          class="text-red-500 text-sm w-full text-left"
          v-for="error of v$.ratePerHour?.$errors"
          :key="error.$uid"
        >
          {{ error.$message }}
        </div>

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
  hourlyRateToken: 0,
  nativeEnabled: false,
  usdcEnabled: false,
  sherEnabled: false
})
const notZero = helpers.withMessage('Amount must be greater than 0', (value: string) => {
  return parseFloat(value) > 0
})
const ratePerHour = computed(() => {
  return [
    ...(wageData.value.hourlyRate > 0
      ? [{ type: 'native', amount: wageData.value.hourlyRate }]
      : []),
    ...(wageData.value.hourlyRateUsdc > 0
      ? [{ type: 'usdc', amount: wageData.value.hourlyRateUsdc }]
      : []),
    ...(wageData.value.hourlyRateToken > 0
      ? [{ type: 'sher', amount: wageData.value.hourlyRateToken }]
      : [])
  ]
})
const atLeastOneRate = helpers.withMessage(
  'At least one hourly rate must be set',
  (value: { type: string; amount: number }[]) => {
    return value.some((rate) => rate.amount > 0)
  }
)

const rules = {
  wageData: {
    maxWeeklyHours: {
      required,
      numeric,
      notZero
    }
  },
  ratePerHour: {
    $each: {
      type: {
        required
      },
      amount: {
        required,
        numeric,
        notZero
      }
    },
    atLeastOneRate
  }
}
const v$ = useVuelidate(rules, { wageData, ratePerHour })

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
    ratePerHour: ratePerHour.value,
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

    emits('refetchWage')
    showSetMemberWageModal.value = false
  }
}
</script>

<style scoped></style>
