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

      <div v-if="newProposalInput.isElection">
        <UFormField name="winnerCount" label="Number of Board Of Directors">
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
          label="Start Date"
          class="mt-4 mb-4"
          :error="errors.startDate"
        >
          <UPopover v-model:open="startDateOpen" class="mt-2 block" data-test="date-picker">
            <UButton
              variant="outline"
              color="neutral"
              class="w-full justify-start font-normal"
              :label="state.startDate ? formatDateMMDDYYYY(state.startDate) : 'mm/dd/yyyy'"
            />
            <template #content>
              <UCalendar
                :model-value="state.startDate ? dateToCalendarDate(state.startDate) : undefined"
                :min-value="dateToCalendarDate(minStartDate)"
                @update:model-value="
                  (val) => {
                    const selectedDate = (val as CalendarDate).toDate(getLocalTimeZone())
                    state.startDate = ensureFutureDate(selectedDate, minStartDate)
                    startDateOpen = false
                  }
                "
              />
            </template>
          </UPopover>
        </UFormField>

        <UFormField name="endDate" label="End Date" class="mb-4" :error="errors.endDate">
          <UPopover v-model:open="endDateOpen" class="mt-2 block" data-test="date-picker">
            <UButton
              variant="outline"
              color="neutral"
              class="w-full justify-start font-normal"
              :label="state.endDate ? formatDateMMDDYYYY(state.endDate) : 'mm/dd/yyyy'"
            />
            <template #content>
              <UCalendar
                :model-value="state.endDate ? dateToCalendarDate(state.endDate) : undefined"
                :min-value="today(getLocalTimeZone())"
                @update:model-value="
                  (val) => {
                    state.endDate = (val as CalendarDate).toDate(getLocalTimeZone())
                    endDateOpen = false
                  }
                "
              />
            </template>
          </UPopover>
        </UFormField>

        <UFormField name="candidates" :error="errors.candidates">
          <MultiSelectMemberInput
            v-model="formData"
            :show-on-focus="true"
            :only-team-members="true"
          />
        </UFormField>
      </div>

      <div class="flex justify-center">
        <UButton
          type="submit"
          :loading="isLoading"
          :disabled="isLoading"
          color="primary"
          size="md"
          class="justify-center"
          data-test="submitButton"
          label="Create Election"
        />
      </div>
    </UForm>
  </div>
</template>

<script setup lang="ts">
import type { OldProposal, User } from '@/types'
import { reactive, ref, onMounted, onUnmounted } from 'vue'
import { z } from 'zod'
import MultiSelectMemberInput from '@/components/utils/MultiSelectMemberInput.vue'
import { CalendarDate, getLocalTimeZone, today } from '@internationalized/date'
import { formatDateMMDDYYYY, dateToCalendarDate, ensureFutureDate } from '@/utils/dayUtils'

// Dev = 2 minutes, Prod = 1 hour
const delay = 2 * 60 * 1000
const minStartDate = new Date(new Date().getTime() + delay)

const startDateOpen = ref(false)
const endDateOpen = ref(false)

const emits = defineEmits(['createProposal'])
defineProps<{ isLoading: boolean }>()

const formData = ref<Array<Pick<User, 'address' | 'name'>>>([])
const errors = reactive({ startDate: '', endDate: '', candidates: '' })

const newProposalInput = ref<Partial<OldProposal>>({
  isElection: true
})

const state = reactive({
  title: '',
  description: '',
  winnerCount: '',
  startDate: minStartDate as Date | null,
  endDate: null as Date | null
})

const schema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  winnerCount: z
    .union([z.string(), z.number()])
    .refine((v) => Number(v) >= 3, 'Number of directors must be at least 3')
    .refine((v) => Number(v) % 2 === 1, 'Number of directors must be an odd number')
})

const submitForm = () => {
  errors.startDate = ''
  errors.endDate = ''
  errors.candidates = ''

  if (!state.startDate) {
    errors.startDate = 'Start date is required'
    return
  }
  if (!state.endDate) {
    errors.endDate = 'End date is required'
    return
  }
  if (state.startDate >= state.endDate) {
    errors.startDate = 'Start date must be before end date'
    return
  }

  const candidates = formData.value.map((user) => ({
    name: user.name || '',
    candidateAddress: user.address || ''
  }))

  const addresses = candidates.map((c) => c.candidateAddress)
  if (new Set(addresses).size !== addresses.length) {
    errors.candidates = 'Duplicate candidates are not allowed.'
    return
  }

  emits('createProposal', {
    ...newProposalInput.value,
    title: state.title,
    description: state.description,
    startDate: state.startDate,
    endDate: state.endDate,
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

onMounted(() => document.addEventListener('click', handleClickOutside))
onUnmounted(() => document.removeEventListener('click', handleClickOutside))
</script>
