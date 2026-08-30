<template>
  <div>
    <UForm :schema="schema" :state="state" @submit="submitForm" class="mt-2 flex flex-col gap-4">
      <UFormField name="title" label="Title">
        <UInput v-model="state.title" placeholder="Title" class="w-full" data-test="titleInput" />
      </UFormField>

      <UFormField name="description" label="Description">
        <UTextarea
          v-model="state.description"
          placeholder="Description"
          class="w-full"
          :rows="4"
          data-test="descriptionInput"
        />
      </UFormField>

      <div v-if="newProposalInput.isElection" class="flex flex-col gap-4">
        <UFormField
          name="winnerCount"
          label="Number of Board Of Directors"
          help="An odd number — 3, 5, 7 … -- so a vote can never end in a tie."
        >
          <UInput
            type="number"
            v-model="state.winnerCount"
            placeholder="Number of Directors"
            class="w-full"
            data-test="winnerCountInput"
          />
        </UFormField>

        <UFormField
          name="startDate"
          label="Start date"
          :error="errors.startDate"
          :help="openingHelp"
        >
          <div class="flex items-center gap-2">
            <UPopover v-model:open="startDateOpen" class="grow" data-test="date-picker">
              <UButton
                variant="outline"
                color="neutral"
                icon="i-lucide-calendar"
                class="w-full justify-start font-normal"
                :label="state.startDay ? formatDate(state.startDay) : 'Pick a day'"
                data-test="startDayButton"
              />
              <template #content>
                <UCalendar
                  :model-value="state.startDay ? dateToCalendarDate(state.startDay) : undefined"
                  :min-value="today(getLocalTimeZone())"
                  @update:model-value="
                    (val: unknown) => {
                      pickStartDay((val as CalendarDate).toDate(getLocalTimeZone()))
                      startDateOpen = false
                    }
                  "
                />
              </template>
            </UPopover>
            <UInput
              type="time"
              v-model="state.startTime"
              :disabled="!state.startDay"
              class="w-36"
              data-test="startTimeInput"
            />
          </div>
        </UFormField>

        <UFormField
          name="endDate"
          label="End date"
          :error="errors.endDate"
          help="Leave the time as it is to close at the end of the chosen day."
        >
          <div class="flex items-center gap-2">
            <UPopover v-model:open="endDateOpen" class="grow" data-test="date-picker">
              <UButton
                variant="outline"
                color="neutral"
                icon="i-lucide-calendar"
                class="w-full justify-start font-normal"
                :label="state.endDay ? formatDate(state.endDay) : 'Pick a day'"
                data-test="endDayButton"
              />
              <template #content>
                <UCalendar
                  :model-value="state.endDay ? dateToCalendarDate(state.endDay) : undefined"
                  :min-value="today(getLocalTimeZone())"
                  @update:model-value="
                    (val: unknown) => {
                      state.endDay = (val as CalendarDate).toDate(getLocalTimeZone())
                      endDateOpen = false
                    }
                  "
                />
              </template>
            </UPopover>
            <UInput type="time" v-model="state.endTime" class="w-36" data-test="endTimeInput" />
          </div>
        </UFormField>

        <UFormField name="candidates" label="Candidates" required :error="errors.candidates">
          <MultiSelectMemberInput
            v-model="formData"
            :show-on-focus="true"
            member-scope="team-members"
          />
        </UFormField>
      </div>

      <UAlert
        v-if="errorMessage"
        color="error"
        variant="soft"
        :description="errorMessage"
        icon="i-lucide-circle-alert"
        class="mt-2"
        data-test="error-alert"
      />

      <div class="flex justify-center">
        <TeamArchivedTooltip v-slot="{ disabled: archivedDisabled }">
          <UButton
            type="submit"
            :loading="isLoading"
            :disabled="isLoading || archivedDisabled"
            color="primary"
            size="md"
            class="justify-center"
            data-test="submitButton"
            label="Create Election"
          />
        </TeamArchivedTooltip>
      </div>
    </UForm>
  </div>
</template>

<script setup lang="ts">
import type { OldProposal, User } from '@/types'
import { computed, reactive, ref, onMounted, onUnmounted } from 'vue'
import { z } from 'zod'
import MultiSelectMemberInput from '@/components/utils/MultiSelectMemberInput.vue'
import { CalendarDate, getLocalTimeZone, today } from '@internationalized/date'
import { combineDayAndTime, dateToCalendarDate } from '@/utils/dayUtils'
import { formatDate, formatDuration, formatTimeOfDay } from '@/utils/format'
import TeamArchivedTooltip from '@/components/ui/TeamArchivedTooltip.vue'

/**
 * How far ahead a ballot opens when the owner does not pick a day, and the
 * shortest lead the contract can be given for a day they do pick: the creating
 * transaction still has to be mined before voting starts.
 *
 * The default opening is computed at submit time, never when the form is built
 * — a form left open for ten minutes would otherwise carry a start already in
 * the past, which the contract refuses.
 */
const START_DELAY_MINUTES = 2
const START_DELAY_MS = START_DELAY_MINUTES * 60 * 1000

/** Shorter than this and the ballot closes before anyone can realistically vote. */
const MIN_DURATION_MINUTES = 5
const MIN_DURATION_MS = MIN_DURATION_MINUTES * 60 * 1000

/** An untouched closing time runs the ballot to the end of the chosen day. */
const END_OF_DAY = '23:59'
/** A day picked ahead of today opens at midnight unless the owner says otherwise. */
const START_OF_DAY = '00:00'

const startDateOpen = ref(false)
const endDateOpen = ref(false)

const emits = defineEmits(['createProposal'])
withDefaults(defineProps<{ isLoading: boolean; errorMessage?: string }>(), {
  errorMessage: ''
})

const formData = ref<Array<Pick<User, 'address' | 'name'>>>([])

const errors = reactive<{ startDate?: string; endDate?: string; candidates?: string }>({})

const newProposalInput = ref<Partial<OldProposal>>({
  isElection: true
})

const state = reactive({
  title: '',
  description: '',
  winnerCount: '',
  startDay: null as Date | null,
  startTime: '',
  endDay: null as Date | null,
  endTime: END_OF_DAY
})

// Kept ticking so the announced opening stays true on a form left open a while.
const now = ref(Date.now())
let clock: ReturnType<typeof setInterval> | undefined
const opensAt = computed(() => new Date(now.value + START_DELAY_MS))

/**
 * With no day picked the field has nothing on screen to read, so it says when
 * the ballot would open. Once a day is picked the field speaks for itself.
 */
const openingHelp = computed(() =>
  state.startDay
    ? 'The ballot opens exactly then.'
    : `Opens at ${formatTimeOfDay(opensAt.value)}, in ${formatDuration(START_DELAY_MINUTES)} -- ` +
      'pick a day to open it later instead.'
)

/**
 * Picking today keeps the ballot openable: midnight has already gone by, so the
 * time is prefilled a couple of minutes out — rounded up to the next whole
 * minute, since that is all the time field can express — and the owner is free
 * to move it. Any other day starts at midnight, as a calendar day does.
 */
const pickStartDay = (day: Date) => {
  state.startDay = day
  if (day.toDateString() !== new Date().toDateString()) {
    state.startTime = START_OF_DAY
    return
  }

  const soon = new Date(Date.now() + START_DELAY_MS)
  soon.setSeconds(0, 0)
  soon.setMinutes(soon.getMinutes() + 1)
  state.startTime = formatTimeOfDay(soon)
}

const schema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  winnerCount: z
    .union([z.string(), z.number()])
    .refine((v) => Number(v) >= 3, 'Number of directors must be at least 3')
    .refine((v) => Number(v) % 2 === 1, 'Number of directors must be an odd number')
})

const submitForm = () => {
  errors.startDate = undefined
  errors.endDate = undefined
  errors.candidates = undefined

  // No day picked means "as soon as possible", worked out now rather than when
  // the form was built. A day that was picked is used exactly as it was given —
  // the only thing refused is an opening that has already gone by, which the
  // contract would reject anyway.
  let startDate = new Date(Date.now() + START_DELAY_MS)
  if (state.startDay) {
    const chosenStart = combineDayAndTime(state.startDay, state.startTime)
    if (!chosenStart) {
      errors.startDate = 'The opening time must be given as hh:mm'
      return
    }
    if (chosenStart.getTime() <= Date.now()) {
      errors.startDate = 'The opening has already gone by. Pick a later day or time.'
      return
    }
    startDate = chosenStart
  }

  if (!state.endDay) {
    errors.endDate = 'A closing day is required'
    return
  }

  const endDate = combineDayAndTime(state.endDay, state.endTime)
  if (!endDate) {
    errors.endDate = 'The closing time must be given as hh:mm'
    return
  }

  if (endDate.getTime() - startDate.getTime() < MIN_DURATION_MS) {
    errors.endDate =
      `A ballot must stay open for at least ${formatDuration(MIN_DURATION_MINUTES)} after it ` +
      'opens. Pick a later closing day or time.'
    return
  }

  const candidates = formData.value.map((user) => ({
    name: user.name || '',
    candidateAddress: user.address || ''
  }))

  if (candidates.length < 1) {
    errors.candidates = 'At least one candidate is required.'
    return
  }

  const minCandidates = Number(state.winnerCount)
  if (Number.isFinite(minCandidates) && candidates.length < minCandidates) {
    errors.candidates = `At least ${minCandidates} candidates are required.`
    return
  }

  const addresses = candidates.map((c) => c.candidateAddress)
  if (new Set(addresses).size !== addresses.length) {
    errors.candidates = 'Duplicate candidates are not allowed.'
    return
  }

  emits('createProposal', {
    ...newProposalInput.value,
    title: state.title,
    description: state.description,
    startDate,
    endDate,
    winnerCount: Number(state.winnerCount),
    candidates
  })
}

const formRef = ref<HTMLElement | null>(null)
const showDropdown = ref<boolean>(false)

const handleClickOutside = (event: MouseEvent) => {
  if (formRef.value && !formRef.value.contains(event.target as Node)) {
    showDropdown.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  clock = setInterval(() => (now.value = Date.now()), 30 * 1000)
})
onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  clearInterval(clock)
})
</script>
