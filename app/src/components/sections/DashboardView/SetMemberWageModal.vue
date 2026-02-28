<template>
  <div>
    <ButtonUI
      size="sm"
      variant="success"
      @click="() => (showModal = true)"
      data-test="set-wage-button"
    >
      Set Wage
    </ButtonUI>

    <ModalComponent v-model="showModal" v-if="showModal">
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
            v-if="errors.maxWeeklyHours"
          >
            {{ errors.maxWeeklyHours }}
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
              v-if="errors.hourlyRate"
            >
              {{ errors.hourlyRate }}
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
              v-if="errors.hourlyRateUsdc"
            >
              {{ errors.hourlyRateUsdc }}
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
              v-if="errors.hourlyRateToken"
            >
              {{ errors.hourlyRateToken }}
            </div>
          </div>
        </div>

        <!-- Error Messages -->
        <div
          data-test="rate-per-hour-error"
          class="text-red-500 text-sm w-full text-left"
          v-if="errors.ratePerHour"
        >
          {{ errors.ratePerHour }}
        </div>

        <div v-if="setWageError" data-test="error-state">
          <div class="alert alert-error">
            {{
              (setWageError as AxiosError<{ message?: string }>).response?.data?.message ||
              'Error setting wage'
            }}
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="modal-action justify-between w-full">
          <ButtonUI
            v-if="props.wage"
            :loading="isMemberWageSaving"
            :disabled="isMemberWageSaving"
            variant="error"
            @click="wageData = initializeWageData()"
            data-test="reset-wage-button"
          >
            Reset Wage
          </ButtonUI>
          <ButtonUI
            variant="error"
            outline
            @click="handleCancel"
            data-test="add-wage-cancel-button"
          >
            Cancel
          </ButtonUI>
          <ButtonUI
            :loading="isMemberWageSaving"
            :disabled="isMemberWageSaving"
            variant="success"
            @click="handleSaveWage"
            data-test="add-wage-button"
          >
            Save
          </ButtonUI>
        </div>
      </div>
    </ModalComponent>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import ButtonUI from '@/components/ButtonUI.vue'
import ModalComponent from '@/components/ModalComponent.vue'
import { useToastStore } from '@/stores'
import type { Member } from '@/types'
import { z } from 'zod'
import { NETWORK } from '@/constant'
import { useSetMemberWageMutation } from '@/queries/wage.queries'
import type { AxiosError } from 'axios'
import type { Wage } from '@/types'

const props = defineProps<{
  member: Partial<Member>
  teamId: number | string
  wage?: Wage
}>()

const emits = defineEmits<{ wageUpdated: [] }>()

const showModal = ref(false)
const { addSuccessToast } = useToastStore()

const initializeWageData = () => {
  if (props.wage) {
    const nativeRate = props.wage.ratePerHour.find((r) => r.type === 'native')?.amount || 0
    const usdcRate = props.wage.ratePerHour.find((r) => r.type === 'usdc')?.amount || 0
    const sherRate = props.wage.ratePerHour.find((r) => r.type === 'sher')?.amount || 0

    return {
      maxWeeklyHours: props.wage.maximumHoursPerWeek || 0,
      hourlyRate: nativeRate,
      hourlyRateUsdc: usdcRate,
      hourlyRateToken: sherRate,
      nativeEnabled: nativeRate > 0,
      usdcEnabled: usdcRate > 0,
      sherEnabled: sherRate > 0
    }
  }

  return {
    maxWeeklyHours: 0,
    hourlyRate: 0,
    hourlyRateUsdc: 0,
    hourlyRateToken: 0,
    nativeEnabled: false,
    usdcEnabled: false,
    sherEnabled: false
  }
}

const wageData = ref(initializeWageData())

const wageSchema = z
  .object({
    maxWeeklyHours: z.coerce
      .number({ message: 'Value is required' })
      .gt(0, 'Amount must be greater than 0'),
    hourlyRate: z.coerce.number({ message: 'Value must be numeric' }),
    hourlyRateUsdc: z.coerce.number({ message: 'Value must be numeric' }),
    hourlyRateToken: z.coerce.number({ message: 'Value must be numeric' }),
    nativeEnabled: z.boolean(),
    usdcEnabled: z.boolean(),
    sherEnabled: z.boolean()
  })
  .refine(
    (data) => data.hourlyRate > 0 || data.hourlyRateUsdc > 0 || data.hourlyRateToken > 0,
    { message: 'At least one hourly rate must be set', path: ['ratePerHour'] }
  )

const errors = ref<Record<string, string>>({})

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

const {
  mutate: executeSetWage,
  isPending: isMemberWageSaving,
  error: setWageError
} = useSetMemberWageMutation()

const handleSaveWage = async () => {
  const result = wageSchema.safeParse(wageData.value)
  if (!result.success) {
    const newErrors: Record<string, string> = {}
    for (const issue of result.error.issues) {
      const key = issue.path.join('.') || '_root'
      if (!newErrors[key]) {
        newErrors[key] = issue.message
      }
    }
    errors.value = newErrors
    return
  }
  errors.value = {}

  executeSetWage(
    {
      body: {
        teamId: props.teamId,
        userAddress: props.member.address || '',
        ratePerHour: ratePerHour.value,
        maximumHoursPerWeek: wageData.value.maxWeeklyHours
      }
    },
    {
      onSuccess: () => {
        addSuccessToast('Member wage data set successfully')
        emits('wageUpdated')
        handleCancel()
      },
      onError: (error: AxiosError) => {
        console.error('Error setting member wage:', error)
        // Toast notification will be handled by parent or error state
      }
    }
  )
}

const handleCancel = () => {
  showModal.value = false
  errors.value = {}
  wageData.value = initializeWageData()
}
</script>
