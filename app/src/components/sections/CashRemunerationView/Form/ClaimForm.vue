<template>
  <UForm
    :schema="claimSchema"
    :state="formData"
    :loading-auto="false"
    class="flex flex-col gap-4"
    @submit="handleSubmit"
  >
    <!-- Date -->
    <UFormField label="Date" name="dayWorked" required>
      <UPopover v-model:open="datePickerOpen">
        <UButton
          variant="outline"
          color="neutral"
          class="w-full justify-start font-normal"
          leading-icon="i-lucide-calendar"
          :disabled="isEdit"
          type="button"
          size="lg"
          data-test="date-input"
          @click="!isEdit && (datePickerOpen = true)"
        >
          {{ calendarDisplayDate }}
        </UButton>
        <template #content>
          <UCalendar
            :year-controls="false"
            :model-value="calendarValue"
            :is-date-disabled="isDateDisabledFn"
            class="p-2"
            @update:model-value="onDateSelect"
          />
        </template>
      </UPopover>
    </UFormField>

    <!-- Hours worked -->
    <UFormField label="Hours worked" name="hoursWorked" required>
      <div class="flex w-full items-start gap-x-2">
        <div class="flex-1">
          <UInput
            v-model="formData.hoursWorked"
            type="text"
            placeholder="0"
            class="w-full"
            size="lg"
            data-test="hours-worked-input"
          >
            <template #trailing>
              <span class="text-sm text-gray-500">h</span>
            </template>
          </UInput>
        </div>
        <span class="shrink-0 text-lg text-gray-400">:</span>
        <div class="flex-1">
          <USelectMenu
            v-model="formData.minutesWorked"
            :items="minutesOptions"
            placeholder="0"
            class="w-full"
            size="lg"
            data-test="minutes-worked-input"
          >
            <template #trailing>
              <span class="text-sm text-gray-500">min</span>
            </template>
          </USelectMenu>
        </div>
      </div>
    </UFormField>

    <!-- Memo -->
    <UFormField
      label="Memo"
      name="memo"
      required
      :hint="`${String(formData.memo).length} / ${DAILY_CLAIM_MEMO_MAX_LENGTH}`"
    >
      <UTextarea
        v-model="formData.memo"
        :placeholder="isEdit ? 'I worked on...' : 'I worked on the ....'"
        class="w-full"
        :rows="3"
        data-test="memo-input"
      />
    </UFormField>

    <UploadFileDB
      :disabled="isLoading"
      :existing-file-count="props.existingFiles?.length ?? 0"
      @update:files="onFilesUpdate"
    />

    <!-- Existing Files Display - File Preview Gallery with Lightbox -->
    <div
      v-if="isEdit && props.existingFiles && props.existingFiles.length > 0"
      data-test="attached-files-section"
    >
      <h4 class="mb-3 text-sm font-semibold text-gray-700">Attached Files:</h4>
      <FilePreviewGallery
        :previews="existingFilePreviews"
        can-remove
        grid-class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2"
        item-height-class="h-20"
        @remove="(index) => $emit('delete-file', index)"
      />
    </div>

    <UAlert
      v-if="errorMessage"
      color="error"
      variant="soft"
      icon="i-heroicons-x-circle"
      :title="errorTitle"
      :description="errorMessage"
      data-test="claim-error-alert"
    />

    <div class="flex justify-center gap-4">
      <UButton
        v-if="isEdit"
        color="error"
        class="w-32 justify-center"
        :disabled="isLoading"
        type="button"
        data-test="cancel-button"
        @click="$emit('cancel')"
      >
        Cancel
      </UButton>
      <UTooltip :text="archivedTooltip">
        <UButton
          type="submit"
          color="success"
          class="w-32 justify-center"
          :disabled="isLoading || isWriteDisabled"
          :loading="isLoading"
          :data-test="isEdit ? 'update-claim-button' : 'submit-claim-button'"
        >
          {{ isEdit ? 'Update' : 'Submit' }}
        </UButton>
      </UTooltip>
    </div>
  </UForm>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { parseDate } from '@internationalized/date'
import type { CalendarDate, DateValue } from '@internationalized/date'
import type { ClaimFormData, ClaimSubmitPayload } from '@/types'
import FilePreviewGallery from '@/components/sections/CashRemunerationView/Form/FilePreviewGallery.vue'
import UploadFileDB from '@/components/sections/CashRemunerationView/Form/UploadFileDB.vue'
import {
  DAILY_CLAIM_MEMO_MAX_LENGTH,
  buildClaimFormSchema,
  createDefaultClaimFormData,
  formatClaimDayUTC,
  getClaimDayFromCalendarValue,
  getClaimFilePreviews,
  isClaimDateDisabled,
  type ClaimSubmissionRules,
  type ClaimFormFileData,
  type CalendarSelectionValue
} from '@/utils/claimFormUtil'
import { useTeamWriteGuard } from '@/composables/useTeamWriteGuard'

const { isWriteDisabled, archivedTooltip } = useTeamWriteGuard()

interface ClaimFormError {
  message?: string
  title?: string
}

interface Props {
  initialData?: Partial<ClaimFormData>
  mode?: 'create' | 'edit'
  loading?: boolean
  existingFiles?: Partial<ClaimFormFileData>[] | null
  submissionRules?: ClaimSubmissionRules
  error?: ClaimFormError
}

const toast = useToast()

const props = withDefaults(defineProps<Props>(), {
  mode: 'create',
  loading: false,
  existingFiles: () => [],
  submissionRules: () => ({ restrictSubmit: true }),
  error: () => ({ message: '', title: 'Failed to submit claim' })
})

const emit = defineEmits<{
  submit: [data: ClaimSubmitPayload & { files?: File[] }]
  cancel: []
  'delete-file': [index: number]
}>()

const MAX_FILES = 10
const minutesOptions = ['0', '10', '20', '30', '40', '50']
const isEdit = computed(() => props.mode === 'edit')
const isLoading = computed(() => props.loading)
const errorMessage = computed(() => props.error.message ?? '')
const errorTitle = computed(() => props.error.title ?? 'Failed to submit claim')
const formData = ref<ClaimFormData>(createDefaultClaimFormData(props.initialData))
const uploadedFiles = ref<File[]>([])
const datePickerOpen = ref(false)

watch(
  () => props.initialData,
  (initialData) => {
    formData.value = createDefaultClaimFormData(initialData)
  },
  { deep: true }
)

const claimSchema = computed(() =>
  buildClaimFormSchema(
    props.submissionRules.maximumHoursPerDay,
    props.submissionRules.existingClaims
  )
)
const existingFilePreviews = computed(() => getClaimFilePreviews(props.existingFiles))
const calendarDisplayDate = computed(() =>
  formData.value.dayWorked ? formatClaimDayUTC(formData.value.dayWorked) : 'Select a date'
)
const calendarValue = computed<CalendarDate | undefined>(() => {
  if (!formData.value.dayWorked) return undefined

  try {
    const [isoDate] = formData.value.dayWorked.split('T')
    return isoDate ? (parseDate(isoDate) as CalendarDate) : undefined
  } catch {
    return undefined
  }
})

const isDateDisabledFn = computed(
  () =>
    (date: DateValue): boolean =>
      isClaimDateDisabled(date, props.submissionRules)
)

const onDateSelect = (value: CalendarSelectionValue) => {
  const dayWorked = getClaimDayFromCalendarValue(value)
  if (!dayWorked) return

  formData.value.dayWorked = dayWorked
  datePickerOpen.value = false
}

const onFilesUpdate = (files: File[]) => {
  uploadedFiles.value = files
}

const handleSubmit = () => {
  const totalFiles = (props.existingFiles?.length ?? 0) + uploadedFiles.value.length
  if (totalFiles > MAX_FILES) {
    toast.add({
      title:
        'Maximum ' +
        MAX_FILES +
        ' files allowed. Currently you have ' +
        totalFiles +
        ' files. Please remove ' +
        (totalFiles - MAX_FILES) +
        ' file(s).',
      color: 'error'
    })
    return
  }

  emit('submit', {
    minutesWorked: Number(formData.value.hoursWorked) * 60 + Number(formData.value.minutesWorked),
    memo: formData.value.memo,
    dayWorked: formData.value.dayWorked,
    files: uploadedFiles.value.length ? uploadedFiles.value : undefined
  })
}
</script>
