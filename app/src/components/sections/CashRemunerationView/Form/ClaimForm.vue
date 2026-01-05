<template>
  <div class="flex flex-col gap-4">
    <div class="flex flex-col gap-2">
      <label class="flex items-center">
        <span class="w-full" data-test="hours-worked-label">Date</span>
      </label>
      <!-- :key forces VueDatePicker to re-render when restriction mode changes -->
      <VueDatePicker
        v-model="formData.dayWorked"
        model-type="iso"
        :format="formatUTC"
        :enable-time-picker="false"
        auto-apply
        :key="restrictSubmitKey"
        :disabled-dates="disabledDatesFn"
        :ui="{
          input: 'input input-bordered input-md'
        }"
        data-test="date-input"
        utc="preserve"
        :disabled="isEdit"
      />
    </div>
    <div class="flex flex-col gap-2">
      <label class="flex items-center">
        <span class="w-full">Hours worked</span>
      </label>
      <input
        type="text"
        class="input input-bordered input-md grow"
        data-test="hours-worked-input"
        placeholder="10"
        v-model="formData.hoursWorked"
      />
      <div
        class="pl-4 text-red-500 text-sm"
        v-for="error of v$.formData.hoursWorked.$errors"
        :key="error.$uid"
        data-test="hours-worked-error"
      >
        {{ error.$message }}
      </div>
    </div>
    <div class="flex flex-col gap-2">
      <label class="flex items-center">
        <span class="w-full">Memo</span>
      </label>
      <textarea
        class="textarea input-bordered"
        :placeholder="isEdit ? 'I worked on...' : 'I worked on the ....'"
        data-test="memo-input"
        v-model="formData.memo"
      ></textarea>
    </div>
    <div
      class="pl-4 text-red-500 text-sm"
      v-for="error of v$.formData.memo.$errors"
      :key="error.$uid"
    >
      {{ error.$message }}
    </div>

    <UploadFileDB
      ref="uploadFileRef"
      @update:files="onFilesUpdate"
      :disabled="isLoading"
      :existing-file-count="props.existingFiles?.length ?? 0"
    />

    <!-- Existing Files Display - File Preview Gallery with Lightbox -->
    <div v-if="isEdit && existingFiles && existingFiles.length > 0">
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
      <ButtonUI
        v-if="isEdit"
        variant="error"
        class="w-32"
        :disabled="isLoading"
        data-test="cancel-button"
        @click="$emit('cancel')"
      >
        Cancel
      </ButtonUI>
      <ButtonUI
        variant="success"
        class="w-32"
        :disabled="isLoading"
        :loading="isLoading"
        :data-test="isEdit ? 'update-claim-button' : 'submit-claim-button'"
        @click="handleSubmit"
      >
        {{ isEdit ? 'Update' : 'Submit' }}
      </ButtonUI>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useVuelidate } from '@vuelidate/core'
import { required, numeric, minValue, maxValue, maxLength } from '@vuelidate/validators'
import type { ClaimFormData } from '@/types'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import ButtonUI from '@/components/ButtonUI.vue'
import FilePreviewGallery from '@/components/sections/CashRemunerationView/Form/FilePreviewGallery.vue'
import { useToastStore } from '@/stores'
// import UploadImage from '@/components/sections/CashRemunerationView/Form/UploadImage.vue' // Deprecated: cloud storage
import UploadFileDB from '@/components/sections/CashRemunerationView/Form/UploadFileDB.vue' // New: database storage

interface FileData {
  fileName: string
  fileType: string
  fileData: string
}

interface Props {
  initialData?: Partial<ClaimFormData>
  isEdit?: boolean
  isLoading?: boolean
  disabledWeekStarts?: string[]
  restrictSubmit?: boolean
  existingFiles?: FileData[]
  deletingFileIndex?: number | null
}

dayjs.extend(utc)

const MAX_FILES = 10
const toastStore = useToastStore()

const props = withDefaults(defineProps<Props>(), {
  isEdit: false,
  isLoading: false,
  disabledWeekStarts: () => [],
  restrictSubmit: true,
  existingFiles: () => [],
  deletingFileIndex: null
})

// Key to force VueDatePicker re-render when restriction mode or disabled weeks change
const restrictSubmitKey = computed(() => {
  return `restrict-${props.restrictSubmit}-${(props.disabledWeekStarts ?? []).length}`
})

const emit = defineEmits<{
  submit: [data: { hoursWorked: number; memo: string; dayWorked: string; files?: File[] }]
  cancel: []
  'delete-file': [index: number]
}>()

const uploadFileRef = ref<InstanceType<typeof UploadFileDB> | null>(null)
const uploadedFiles = ref<File[]>([])

const onFilesUpdate = (files: File[]): void => {
  uploadedFiles.value = files
}

// Convert FileData to PreviewItem for FilePreviewGallery
const existingFilePreviews = computed(() => {
  return (props.existingFiles ?? []).map((file) => ({
    previewUrl: `data:${file.fileType};base64,${file.fileData}`,
    fileName: file.fileName,
    fileSize: 0,
    fileType: file.fileType,
    isImage: file.fileType.startsWith('image/')
  }))
})

const createDefaultFormData = (overrides?: Partial<ClaimFormData>): ClaimFormData => ({
  hoursWorked: overrides?.hoursWorked ?? '',
  memo: overrides?.memo ?? '',
  dayWorked: overrides?.dayWorked ?? dayjs().utc().startOf('day').toISOString()
})

const formData = ref<ClaimFormData>(createDefaultFormData(props.initialData))

const rules = {
  formData: {
    hoursWorked: { required, numeric, minValue: minValue(1), maxValue: maxValue(24) },
    memo: { required, maxLength: maxLength(200) },
    dayWorked: { required }
  }
}

const v$ = useVuelidate(rules, { formData })

watch(
  () => props.initialData,
  (newInitialData) => {
    formData.value = createDefaultFormData(newInitialData)
  },
  { deep: true }
)

const formatUTC = (value: Date | string | null | undefined) => {
  if (!value) return ''
  if (value instanceof Date) {
    const year = value.getFullYear()
    const month = value.getMonth()
    const day = value.getDate()
    return dayjs.utc(Date.UTC(year, month, day)).format('YYYY-MM-DD [UTC]')
  }
  return dayjs.utc(value).format('YYYY-MM-DD [UTC]')
}

const disabledDatesFn = computed(() => {
  return (value: Date | string | null): boolean => {
    if (!value) return false

    const date = dayjs.utc(value).startOf('day')
    const today = dayjs.utc().startOf('day')

    const disabledWeekKeys = (props.disabledWeekStarts ?? []).map((w) =>
      dayjs.utc(w).startOf('isoWeek').format('YYYY-MM-DD')
    )

    const dateWeekKey = date.startOf('isoWeek').format('YYYY-MM-DD')

    // 🔒 Rule 1: approved weeks are ALWAYS disabled
    if (disabledWeekKeys.includes(dateWeekKey)) {
      return true
    }

    // 🔐 Rule 2: restriction mode (current week only)
    if (props.restrictSubmit) {
      const currentWeekStart = today.startOf('isoWeek')
      const currentWeekEnd = today.endOf('isoWeek')

      // Outside current week
      if (date.isBefore(currentWeekStart, 'day') || date.isAfter(currentWeekEnd, 'day')) {
        return true
      }

      // Max 4 days in the past (within current week)
      const daysDiff = today.diff(date, 'day')
      return daysDiff < 0 || daysDiff > 4
    }

    return false
  }
})

const handleSubmit = async () => {
  v$.value.$touch()
  if (v$.value.$invalid) return

  // Validate total file count
  const totalFiles = (props.existingFiles?.length ?? 0) + uploadedFiles.value.length
  if (totalFiles > MAX_FILES) {
    toastStore.addErrorToast(
      `Maximum ${MAX_FILES} files allowed. Currently you have ${totalFiles} files. Please remove ${totalFiles - MAX_FILES} file(s).`
    )
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
  resetForm
})
</script>
