<template>
  <div class="flex flex-col gap-5">
    <UStepper :model-value="showSummary ? 1 : 0" :items="stepperItems" disabled class="w-full" />

    <UForm
      v-if="!showSummary"
      :schema="schema"
      :state="formState"
      class="flex flex-col gap-6"
      @submit="handleDisplaySummary"
    >
      <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.85fr)]">
        <div class="flex min-w-0 flex-col gap-6">
          <section class="space-y-4">
            <div>
              <h3 class="font-semibold">Beneficiary and grant</h3>
              <p class="text-muted text-sm">Choose who receives the shares and the total grant.</p>
            </div>

            <UFormField
              name="memberAddress"
              label="Beneficiary"
              help="Only current team members can receive this schedule."
              required
            >
              <div v-if="member.address" class="flex items-center gap-2">
                <UserComponent
                  class="bg-muted min-w-0 grow rounded-lg p-3"
                  :user="member"
                  data-test="selected-member"
                />
                <UButton
                  type="button"
                  color="neutral"
                  variant="ghost"
                  label="Change"
                  data-test="change-member"
                  @click="clearMember"
                />
              </div>
              <SelectMemberInput
                v-else
                class="w-full text-xs"
                :hidden-members="[]"
                :disable-team-members="false"
                show-on-focus
                only-team-members
                data-test="member"
                @selectMember="handleSelectMember"
              />
            </UFormField>

            <UFormField
              name="totalAmount"
              label="Total shares"
              help="The maximum number of shares this schedule can mint."
              required
            >
              <UInput
                :model-value="totalAmount"
                type="text"
                inputmode="decimal"
                placeholder="100,000"
                class="w-full"
                data-test="total-amount"
                @update:model-value="totalAmount = String($event ?? '').replace(/,/g, '')"
              >
                <template #trailing>
                  <span class="text-muted text-xs font-semibold">{{ tokenSymbol }}</span>
                </template>
              </UInput>
            </UFormField>
          </section>

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

      <div class="flex flex-col-reverse justify-end gap-2 sm:flex-row">
        <UButton
          type="button"
          color="neutral"
          variant="ghost"
          label="Cancel"
          data-test="cancel-button"
          @click="emit('closeAddVestingModal')"
        />
        <TeamArchivedTooltip v-slot="{ disabled: archivedDisabled }">
          <UButton
            type="submit"
            color="primary"
            :disabled="loading || archivedDisabled"
            :loading="loading"
            label="Review schedule"
            data-test="submit-btn"
          />
        </TeamArchivedTooltip>
      </div>
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
import SelectMemberInput from '@/components/utils/SelectMemberInput.vue'
import UserComponent from '@/components/UserComponent.vue'
import VestingSchedulePreview from '@/components/sections/VestingView/VestingSchedulePreview.vue'
import VestingSummary from '@/components/sections/VestingView/VestingSummary.vue'
import VestingDateTimeField from './VestingDateTimeField.vue'
import VestingPresetButtons from './VestingPresetButtons.vue'
import TeamArchivedTooltip from '@/components/TeamArchivedTooltip.vue'
import { useCreateVesting } from '@/composables/vesting/useCreateVesting'

const emit = defineEmits<{
  reload: []
  closeAddVestingModal: []
}>()

const emitVestingEvent = (event: 'reload' | 'closeAddVestingModal') => {
  if (event === 'reload') emit('reload')
  else emit('closeAddVestingModal')
}

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

const {
  member,
  totalAmount,
  startDay,
  startTime,
  endDay,
  endTime,
  cliffDay,
  cliffTime,
  noCliff,
  startAt,
  endAt,
  cliffEndAt,
  durationPresetMonths,
  cliffPresetMonths,
  durationLabel,
  cliffDurationLabel,
  tokenSymbol,
  showSummary,
  errorMessage,
  feedbackColor,
  vestingData,
  formState,
  schema,
  loading,
  handleSelectMember,
  clearMember,
  setStartDay,
  setStartTime,
  setEndDay,
  setEndTime,
  setCliffDay,
  setCliffTime,
  selectDurationPreset,
  selectCliffPreset,
  handleDisplaySummary,
  submit
} = useCreateVesting(emitVestingEvent)

function handleDurationPreset(months: number | null) {
  if (months === null) durationPresetMonths.value = null
  else selectDurationPreset(months)
}
</script>
