<template>
  <div class="flex flex-col gap-5">
    <UStepper :model-value="showSummary ? 1 : 0" :items="stepperItems" disabled class="w-full" />

    <UForm
      v-if="!showSummary"
      ref="form"
      :schema="schema"
      :state="formState"
      class="flex flex-col gap-6"
      @submit="handleDisplaySummary"
    >
      <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.85fr)]">
        <div class="flex min-w-0 flex-col gap-6">
          <VestingGrantDetails
            v-model:member="member"
            v-model:total-amount="totalAmount"
            :token-symbol="tokenSymbol"
          />

          <section class="space-y-4">
            <div>
              <h3 class="font-semibold">Schedule</h3>
              <p class="text-muted text-sm">Set each boundary in your local time, to the minute.</p>
            </div>

            <VestingDateTimeField
              name="startAt"
              label="Starts"
              help="The moment shares begin accruing."
              test-id="vesting-start"
              :day="startDay"
              :time="startTime"
              :value="startAt"
              @update:day="setStartDay"
              @update:time="setStartTime"
            />

            <VestingPresetButtons
              label="Duration presets"
              test-prefix="duration"
              :presets="durationPresets"
              :selected="durationPresetMonths"
              :custom-active="durationPresetMonths === null && Boolean(endAt)"
              @select="handleDurationPreset"
            />

            <VestingDateTimeField
              name="endAt"
              label="Fully vested"
              help="The exact moment the full grant has accrued."
              test-id="vesting-end"
              :day="endDay"
              :time="endTime"
              :value="endAt"
              @update:day="setEndDay"
              @update:time="setEndTime"
            />

            <p class="text-muted text-sm" data-test="duration-readout">
              Exact duration: <span class="text-highlighted font-medium">{{ durationLabel }}</span>
            </p>

            <VestingPresetButtons
              label="Cliff"
              test-prefix="cliff"
              :presets="cliffPresets"
              :selected="cliffPresetMonths"
              :custom-active="cliffPresetMonths === null"
              @select="selectCliffPreset"
            />

            <VestingDateTimeField
              v-if="!noCliff"
              name="cliffEndAt"
              label="Cliff ends"
              help="Accrued shares first become claimable at this exact moment."
              test-id="vesting-cliff"
              :day="cliffDay"
              :time="cliffTime"
              :value="cliffEndAt"
              @update:day="setCliffDay"
              @update:time="setCliffTime"
            />

            <p class="text-muted text-sm" data-test="cliff-duration-readout">
              Cliff duration:
              <span class="text-highlighted font-medium">{{ cliffDurationLabel }}</span>
            </p>
          </section>
        </div>

        <div class="min-w-0 lg:sticky lg:top-4 lg:self-start">
          <VestingSchedulePreview
            :start-at="startAt"
            :end-at="endAt"
            :cliff-end-at="cliffEndAt"
            :no-cliff="noCliff"
            :total-amount="totalAmount"
            :token-symbol="tokenSymbol"
          />

          <UAlert
            class="mt-4"
            color="neutral"
            variant="soft"
            icon="i-lucide-shield-check"
            description="No shares move today. Vested shares are minted when the beneficiary claims them."
          />
        </div>
      </div>

      <UAlert
        v-if="errorMessage"
        :color="feedbackColor"
        variant="soft"
        icon="i-lucide-circle-alert"
        :description="errorMessage"
        data-test="error-alert"
      />

      <VestingFormActions :loading="loading" @cancel="emit('closeAddVestingModal')" />
    </UForm>

    <div v-else-if="vestingData" class="flex flex-col gap-4">
      <UAlert
        v-if="errorMessage"
        :color="feedbackColor"
        variant="soft"
        icon="i-lucide-circle-alert"
        :description="errorMessage"
        data-test="summary-error-alert"
      />
      <VestingSummary
        :vesting="vestingData"
        :loading="loading"
        @back="showSummary = false"
        @confirm="submit"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
/* eslint-disable max-lines -- The form owns its reactive state; extracting a controller would recreate the removed one-consumer composable. */
import { computed, ref, useTemplateRef, watch, type Ref } from 'vue'
import { isAddress } from 'viem'
import { useToast } from '@nuxt/ui/composables'
import VestingSchedulePreview from '@/components/sections/VestingView/VestingSchedulePreview.vue'
import VestingSummary from '@/components/sections/VestingView/VestingSummary.vue'
import VestingFormActions from './VestingFormActions.vue'
import VestingGrantDetails from './VestingGrantDetails.vue'
import VestingDateTimeField from './VestingDateTimeField.vue'
import VestingPresetButtons from './VestingPresetButtons.vue'
import { useInvestorSymbol } from '@/composables/investor/reads'
import { useVestingAddVestingWrite } from '@/composables/vesting/writes'
import { formatTimeOfDay } from '@/utils/format'
import {
  addVestingMonths,
  buildAddVestingArgs,
  buildVestingCreation,
  classifyError,
  formatVestingDuration,
  nextVestingMinute,
  resolveVestingBoundary,
  resolveVestingTokenSymbol,
  vestingCreationSchema
} from '@/utils'

const emit = defineEmits<{
  closeAddVestingModal: []
}>()

type FeedbackColor = 'error' | 'warning'

const durationPresets = [
  { label: '1 year', value: 12 },
  { label: '2 years', value: 24 },
  { label: '4 years', value: 48 }
]
const cliffPresets = [
  { label: 'No cliff', value: 0 },
  { label: '3 months', value: 3 },
  { label: '6 months', value: 6 },
  { label: '1 year', value: 12 }
]
const stepperItems = [{ title: 'Configure' }, { title: 'Review' }]

const toast = useToast()
const initialStart = nextVestingMinute()

const form = useTemplateRef<{ clear: (path?: string) => void }>('form')
const member = ref({ name: '', address: '' })
const totalAmount = ref('')

/**
 * The beneficiary is picked through a custom selector, not a native form input,
 * so UForm never revalidates `memberAddress` on its own. Clear any stale field
 * error as soon as a valid member is chosen.
 */
watch(
  () => member.value.address,
  (address) => {
    if (address && isAddress(address, { strict: false })) form.value?.clear('memberAddress')
  }
)
const startDay = ref<Date | null>(initialStart)
const startTime = ref(formatTimeOfDay(initialStart))
const endDay = ref<Date | null>(null)
const endTime = ref('')
const cliffDay = ref<Date | null>(null)
const cliffTime = ref('')
const noCliff = ref(true)
const durationPresetMonths = ref<number | null>(null)
const cliffPresetMonths = ref<number | null>(0)
const showSummary = ref(false)
const errorMessage = ref('')
const feedbackColor = ref<FeedbackColor>('error')

const startAt = computed(() => resolveVestingBoundary(startDay.value, startTime.value))
const endAt = computed(() => resolveVestingBoundary(endDay.value, endTime.value))
const selectedCliffAt = computed(() => resolveVestingBoundary(cliffDay.value, cliffTime.value))
const cliffEndAt = computed(() => (noCliff.value ? startAt.value : selectedCliffAt.value))
const durationLabel = computed(() => formatVestingDuration(startAt.value, endAt.value))
const cliffDurationLabel = computed(() =>
  noCliff.value ? 'No cliff' : formatVestingDuration(startAt.value, cliffEndAt.value)
)

const { data: investorSymbol } = useInvestorSymbol()
const tokenSymbol = computed(() => resolveVestingTokenSymbol(investorSymbol.value))

const vestingData = computed(() =>
  buildVestingCreation({
    member: member.value,
    totalAmount: totalAmount.value,
    tokenSymbol: tokenSymbol.value,
    startAt: startAt.value,
    endAt: endAt.value,
    cliffEndAt: cliffEndAt.value,
    noCliff: noCliff.value
  })
)

const formState = computed(() => ({
  memberAddress: member.value.address,
  totalAmount: totalAmount.value,
  startAt: startAt.value,
  endAt: endAt.value,
  cliffEndAt: cliffEndAt.value
}))
const schema = vestingCreationSchema

const addVestingWrite = useVestingAddVestingWrite()
const loading = computed(() => addVestingWrite.isPending.value)

function updateBoundary(day: Ref<Date | null>, time: Ref<string>, value: Date) {
  day.value = value
  time.value = formatTimeOfDay(value)
}

function syncPresetBoundaries() {
  if (!startAt.value) return
  if (durationPresetMonths.value !== null) {
    updateBoundary(endDay, endTime, addVestingMonths(startAt.value, durationPresetMonths.value))
  }
  if (!noCliff.value && cliffPresetMonths.value !== null) {
    updateBoundary(cliffDay, cliffTime, addVestingMonths(startAt.value, cliffPresetMonths.value))
  }
}

function setStartDay(value: Date) {
  startDay.value = value
  syncPresetBoundaries()
}

function setStartTime(value: string) {
  startTime.value = value
  syncPresetBoundaries()
}

function setEndDay(value: Date) {
  endDay.value = value
  durationPresetMonths.value = null
}

function setEndTime(value: string) {
  endTime.value = value
  durationPresetMonths.value = null
}

function setCliffDay(value: Date) {
  cliffDay.value = value
  cliffPresetMonths.value = null
  noCliff.value = false
}

function setCliffTime(value: string) {
  cliffTime.value = value
  cliffPresetMonths.value = null
  noCliff.value = false
}

function selectDurationPreset(months: number) {
  durationPresetMonths.value = months
  if (startAt.value) {
    updateBoundary(endDay, endTime, addVestingMonths(startAt.value, months))
  }
}

function selectCliffPreset(months: number | null) {
  if (months === 0) {
    noCliff.value = true
    cliffPresetMonths.value = 0
    cliffDay.value = null
    cliffTime.value = ''
    return
  }

  noCliff.value = false
  cliffPresetMonths.value = months
  if (!startAt.value) return

  updateBoundary(cliffDay, cliffTime, addVestingMonths(startAt.value, months ?? 0))
}

function handleDisplaySummary() {
  errorMessage.value = ''
  if (vestingCreationSchema.safeParse(formState.value).success) showSummary.value = true
}

async function submit() {
  errorMessage.value = ''
  feedbackColor.value = 'error'
  const data = vestingData.value
  if (!data) return

  try {
    await addVestingWrite.mutateAsync({
      args: buildAddVestingArgs(data)
    })

    toast.add({ title: 'Vesting schedule created', color: 'success' })
    resetForm()
    emit('closeAddVestingModal')
  } catch (error) {
    const classified = classifyError(error, { contract: 'Vesting' })
    if (classified.category === 'user_rejected') {
      feedbackColor.value = 'warning'
      errorMessage.value = 'The wallet request was cancelled. No schedule was created.'
      return
    }
    errorMessage.value = classified.userMessage
  }
}

function resetForm() {
  const newStart = nextVestingMinute()
  member.value = { name: '', address: '' }
  totalAmount.value = ''
  startDay.value = newStart
  startTime.value = formatTimeOfDay(newStart)
  endDay.value = null
  endTime.value = ''
  cliffDay.value = null
  cliffTime.value = ''
  noCliff.value = true
  durationPresetMonths.value = null
  cliffPresetMonths.value = 0
  showSummary.value = false
  errorMessage.value = ''
  addVestingWrite.reset()
}

function handleDurationPreset(months: number | null) {
  if (months === null) durationPresetMonths.value = null
  else selectDurationPreset(months)
}
</script>
