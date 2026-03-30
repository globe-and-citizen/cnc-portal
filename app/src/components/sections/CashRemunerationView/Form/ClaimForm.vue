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
      <UInput
        v-model="formData.hoursWorked"
        type="text"
        placeholder="10"
        class="w-full"
        size="lg"
        data-test="hours-worked-input"
      />
    </UFormField>

    <!-- Memo -->
    <UFormField label="Memo" name="memo" required :hint="`${String(formData.memo).length} / 3000`">
      <UTextarea
        v-model="formData.memo"
        :placeholder="isEdit ? 'I worked on...' : 'I worked on the ....'"
        class="w-full"
        :rows="3"
        data-test="memo-input"
      />
    </UFormField>

    <UploadFileDB
      ref="uploadFileRef"
      :disabled="isLoading"
      :existing-file-count="props.existingFiles?.length ?? 0"
      @update:files="onFilesUpdate"
    />

    <!-- Existing Files Display - File Preview Gallery with Lightbox -->
    <div
      v-if="isEdit && existingFiles && existingFiles.length > 0"
      data-test="attached-files-section"
    >
      <h4 class="text-sm font-semibold mb-3 text-gray-700">Attached Files:</h4>
      <FilePreviewGallery
        :previews="existingFilePreviews"
        can-remove
        grid-class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2"
        item-height-class="h-20"
        @remove="(index) => $emit('delete-file', index)"
      />
    </div>

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
      <UButton
        type="submit"
        color="success"
        class="w-32 justify-center"
        :disabled="isLoading"
        :loading="isLoading"
        :data-test="isEdit ? 'update-claim-button' : 'submit-claim-button'"
      >
        {{ isEdit ? 'Update' : 'Submit' }}
      </UButton>
    </div>
  </UForm>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { z } from 'zod'
import { parseDate } from '@internationalized/date'
import type { DateValue, CalendarDate } from '@internationalized/date'
import type { ClaimFormData } from '@/types'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import FilePreviewGallery from '@/components/sections/CashRemunerationView/Form/FilePreviewGallery.vue'
import UploadFileDB from '@/components/sections/CashRemunerationView/Form/UploadFileDB.vue'

interface FileData {
  fileName?: string // Optional - can be derived from fileKey if not provided
  fileType: string
  fileSize: number
  fileKey: string
  fileUrl: string
}

interface Props {
  initialData?: Partial<ClaimFormData>
  isEdit?: boolean
  isLoading?: boolean
  disabledWeekStarts?: string[]
  restrictSubmit?: boolean
  // Accept partial FileData without fileName
  existingFiles?: Partial<FileData>[]
  deletingFileIndex?: number | null
}

dayjs.extend(utc)

const MAX_FILES = 10
const toast = useToast()

const props = withDefaults(defineProps<Props>(), {
  isEdit: false,
  isLoading: false,
  disabledWeekStarts: () => [],
  restrictSubmit: true,
  existingFiles: () => [],
  deletingFileIndex: null
})

const emit = defineEmits<{
  submit: [data: { hoursWorked: number; memo: string; dayWorked: string; files?: File[] }]
  cancel: []
  'delete-file': [index: number]
}>()

// Zod validation schema
const claimSchema = z.object({
  hoursWorked: z
    .union([z.string(), z.number()])
    .refine((val) => String(val).trim() !== '', { message: 'Hours worked is required' })
    .refine((val) => !isNaN(Number(val)), { message: 'Must be a valid number' })
    .refine((val) => Number(val) >= 1, { message: 'Must be at least 1 hour' })
    .refine((val) => Number(val) <= 24, { message: 'Cannot exceed 24 hours' }),
  memo: z.string().min(1, 'Memo is required').max(3000, 'Memo must not exceed 3000 characters'),
  dayWorked: z.string().min(1, 'Date is required')
})

const uploadFileRef = ref<InstanceType<typeof UploadFileDB> | null>(null)
const uploadedFiles = ref<File[]>([])
const datePickerOpen = ref(false)

const onFilesUpdate = (files: File[]): void => {
  uploadedFiles.value = files
}

// Convert FileData to PreviewItem for FilePreviewGallery
const existingFilePreviews = computed(() => {
  return (props.existingFiles ?? [])
    .filter((file) => file && file.fileUrl && file.fileType && file.fileKey)
    .map((file) => {
      const fileUrl = file.fileUrl!
      const fileType = file.fileType!
      const fileSize = file.fileSize || 0
      const fileKey = file.fileKey!
      const fileName = file.fileName || fileKey.split('/').pop() || 'file'
      return {
        previewUrl: fileUrl,
        fileName,
        fileSize,
        fileType,
        isImage: fileType.startsWith('image/')
      }
    })
})

const createDefaultFormData = (overrides?: Partial<ClaimFormData>): ClaimFormData => ({
  hoursWorked: overrides?.hoursWorked ?? '',
  memo: overrides?.memo ?? '',
  dayWorked: overrides?.dayWorked ?? dayjs().utc().startOf('day').toISOString()
})

const formData = ref<ClaimFormData>(createDefaultFormData(props.initialData))

watch(
  () => props.initialData,
  (newInitialData) => {
    formData.value = createDefaultFormData(newInitialData)
  },
  { deep: true }
)

// Kept for backward compatibility with existing tests
const formatUTC = (value: Date | string | null | undefined): string => {
  if (!value) return ''
  if (value instanceof Date) {
    const year = value.getFullYear()
    const month = value.getMonth()
    const day = value.getDate()
    return dayjs.utc(Date.UTC(year, month, day)).format('YYYY-MM-DD [UTC]')
  }
  return dayjs.utc(value).format('YYYY-MM-DD [UTC]')
}

// Display label shown on the date picker button
const calendarDisplayDate = computed(() => {
  if (!formData.value.dayWorked) return 'Select a date'
  return formatUTC(formData.value.dayWorked)
})

// CalendarDate derived from the ISO dayWorked string
const calendarValue = computed<CalendarDate | undefined>(() => {
  if (!formData.value.dayWorked) return undefined
  try {
    const [isoDatePart] = formData.value.dayWorked.split('T')
    if (!isoDatePart) return undefined
    return parseDate(isoDatePart) as CalendarDate
  } catch {
    return undefined
  }
})

const isSingleDateValue = (value: unknown): value is DateValue => {
  if (!value || Array.isArray(value) || typeof value !== 'object') return false
  return 'year' in value && 'month' in value && 'day' in value
}

type CalendarSelectionValue =
  | DateValue
  | { start: DateValue | undefined; end: DateValue | undefined }
  | DateValue[]
  | null
  | undefined

// Convert a CalendarDate selection back to an ISO string and close the picker
const onDateSelect = (value: CalendarSelectionValue) => {
  if (!isSingleDateValue(value)) return
  const { year, month, day } = value
  formData.value.dayWorked = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T00:00:00.000Z`
  datePickerOpen.value = false
}

// Reactive disabled-date function for UCalendar
const isDateDisabledFn = computed(() => {
  return (date: DateValue): boolean => {
    const { year, month, day } = date
    const d = dayjs
      .utc(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`)
      .startOf('day')
    const today = dayjs.utc().startOf('day')

    const disabledWeekKeys = (props.disabledWeekStarts ?? []).map((w) =>
      dayjs.utc(w).startOf('isoWeek').format('YYYY-MM-DD')
    )
    const dateWeekKey = d.startOf('isoWeek').format('YYYY-MM-DD')

    // 🔒 Rule 1: approved weeks are ALWAYS disabled
    if (disabledWeekKeys.includes(dateWeekKey)) return true

    // 🔐 Rule 2: restriction mode (current week only)
    if (props.restrictSubmit) {
      const currentWeekStart = today.startOf('isoWeek')
      const currentWeekEnd = today.endOf('isoWeek')
      if (d.isBefore(currentWeekStart, 'day') || d.isAfter(currentWeekEnd, 'day')) return true
      const daysDiff = today.diff(d, 'day')
      return daysDiff < 0 || daysDiff > 4
    }

    return false
  }
})

const handleSubmit = async () => {
  // Validate total file count before emitting
  const totalFiles = (props.existingFiles?.length ?? 0) + uploadedFiles.value.length
  if (totalFiles > MAX_FILES) {
    toast.add({
      title: `Maximum ${MAX_FILES} files allowed. Currently you have ${totalFiles} files. Please remove ${totalFiles - MAX_FILES} file(s).`,
      color: 'error'
    })
    return
  }

  emit('submit', {
    hoursWorked: Number(formData.value.hoursWorked),
    memo: formData.value.memo,
    dayWorked: formData.value.dayWorked,
    files: uploadedFiles.value.length ? uploadedFiles.value : undefined
  })
}

const resetForm = () => {
  uploadFileRef.value?.resetUpload()
  uploadedFiles.value = []
}

defineExpose({
  resetForm,
  formatUTC
})
</script>
