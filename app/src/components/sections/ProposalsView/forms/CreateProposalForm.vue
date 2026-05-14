<template>
  <!-- Modal title already communicates form purpose -->
  <UForm :schema="schema" :state="state" @submit="handleSubmit" class="flex w-full flex-col gap-2">
    <UFormField name="title" label="Title">
      <UInput v-model="state.title" placeholder="Enter proposal title" class="w-full" />
    </UFormField>

    <UFormField name="description" label="Description">
      <UTextarea
        v-model="state.description"
        placeholder="Describe your proposal..."
        class="w-full"
        :rows="4"
      />
    </UFormField>

    <UFormField name="type" label="Type">
      <USelect
        v-model="state.type"
        :items="types"
        value-key="value"
        label-key="label"
        class="w-full"
      />
    </UFormField>

    <div class="flex flex-row items-start justify-between gap-4">
      <UFormField name="startDate" label="Start Date" class="flex-1">
        <UPopover v-model:open="startDateOpen">
          <UButton
            variant="outline"
            color="neutral"
            class="w-full justify-start font-normal"
            :label="state.startDate ? formatDateMMDDYYYY(state.startDate) : 'mm/dd/yyyy'"
          />
          <template #content>
            <UCalendar
              :model-value="state.startDate ? dateToCalendarDate(state.startDate) : undefined"
              :min-value="today(getLocalTimeZone())"
              @update:model-value="
                (val) => {
                  const minStart = new Date(Date.now() + MIN_START_DELAY_MS)
                  state.startDate = ensureFutureDate(
                    (val as CalendarDate).toDate(getLocalTimeZone()),
                    minStart
                  )
                  startDateOpen = false
                }
              "
            />
          </template>
        </UPopover>
      </UFormField>
      <UFormField name="endDate" label="End Date" class="flex-1">
        <UPopover v-model:open="endDateOpen">
          <UButton
            variant="outline"
            color="neutral"
            class="w-full justify-start font-normal"
            :label="state.endDate ? formatDateMMDDYYYY(state.endDate) : 'mm/dd/yyyy'"
          />
          <template #content>
            <UCalendar
              :model-value="state.endDate ? dateToCalendarDate(state.endDate) : undefined"
              :min-value="
                state.startDate ? dateToCalendarDate(state.startDate) : today(getLocalTimeZone())
              "
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
    </div>

    <UAlert
      v-if="errorMessage"
      color="error"
      variant="soft"
      icon="i-lucide-circle-alert"
      :description="errorMessage"
      class="mt-2"
      data-test="error-alert"
    />

    <div class="modal-action">
      <UButton color="error" variant="outline" @click="emit('closeModal')" label="Cancel" />
      <UButton
        type="submit"
        color="primary"
        :loading="isCreatingProposal"
        :disabled="isCreatingProposal"
        data-test="create-proposal-button"
        label="Create Proposal"
      />
    </div>
  </UForm>
</template>

<script setup lang="ts">
import { CalendarDate, getLocalTimeZone, today } from '@internationalized/date'
import { reactive, ref, computed } from 'vue'
import { z } from 'zod'
import { useProposalsCreateProposal } from '@/composables/proposals/writes'
import { formatDateMMDDYYYY, dateToCalendarDate, ensureFutureDate } from '@/utils/dayUtils'

// 2 minutes buffer to ensure startDate is in the future when tx hits the chain
const MIN_START_DELAY_MS = 2 * 60 * 1000

const emit = defineEmits(['closeModal', 'proposal-created'])

const toast = useToast()

const startDateOpen = ref(false)
const endDateOpen = ref(false)
const errorMessage = ref('')

const state = reactive({
  title: '',
  description: '',
  type: 'Financial' as 'Financial' | 'Technical' | 'Operational',
  startDate: null as Date | null,
  endDate: null as Date | null
})

const types = [
  { label: 'Financial', value: 'Financial' },
  { label: 'Technical', value: 'Technical' },
  { label: 'Operational', value: 'Operational' }
]

const schema = computed(() =>
  z.object({
    title: z
      .string()
      .min(3, 'Title must be at least 3 characters')
      .max(100, 'Title must be less than 100 characters'),
    description: z
      .string()
      .min(10, 'Description must be at least 10 characters')
      .max(1000, 'Description must be less than 1000 characters'),
    type: z.enum(['Financial', 'Technical', 'Operational']),
    startDate: z
      .instanceof(Date)
      .nullable()
      .refine((v) => v !== null, 'Start date is required'),
    endDate: z
      .instanceof(Date)
      .nullable()
      .refine((v) => v !== null, 'End date is required')
      .refine(
        (v) => !v || !state.startDate || v > state.startDate,
        'End date must be after start date'
      )
  })
)

const { mutate: createProposal, isPending: isCreatingProposal } = useProposalsCreateProposal()

const dateToTimestamp = (date: Date): number => Math.floor(date.getTime() / 1000)

const handleSubmit = () => {
  errorMessage.value = ''
  createProposal(
    {
      args: [
        state.title,
        state.description,
        state.type,
        BigInt(dateToTimestamp(state.startDate!)),
        BigInt(dateToTimestamp(state.endDate!))
      ]
    },
    {
      onSuccess: () => {
        toast.add({ title: 'Proposal created successfully!', color: 'success' })
        emit('proposal-created')
      },
      onError: (error) => {
        console.error(error)
        errorMessage.value = error.message || 'Failed to create proposal'
      }
    }
  )
}
</script>
