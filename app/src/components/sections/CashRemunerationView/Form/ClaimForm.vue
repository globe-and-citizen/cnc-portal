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

    <UploadFileDB ref="uploadFileRef" @update:files="onFilesUpdate" :disabled="isLoading" />

    <!-- Existing Files Display - Before Buttons -->
    <div v-if="existingFiles && existingFiles.length > 0" class="pt-4">
      <h4 class="text-sm font-semibold mb-3 text-gray-700">Attached Files:</h4>
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        <div
          v-for="(file, index) in existingFiles"
          :key="index"
          class="relative group"
          :data-test="`existing-file-${index}`"
        >
          <!-- Image preview -->
          <div
            v-if="isImageFile(file)"
            class="relative cursor-pointer"
            @click="() => $emit('preview-image', file)"
          >
            <img
              :src="getFileDataUrl(file)"
              :alt="file.fileName"
              class="w-full h-20 object-cover rounded border border-gray-300 hover:border-emerald-500 transition-all group-hover:brightness-90"
            />
            <div
              class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all rounded flex items-center justify-center pointer-events-none"
            >
              <Icon
                icon="heroicons:magnifying-glass-plus"
                class="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity"
              />
            </div>
            <button
              @click.stop.prevent="$emit('delete-file', index)"
              :disabled="deletingFileIndex === index"
              class="absolute top-1 right-1 btn btn-xs btn-circle btn-error opacity-0 group-hover:opacity-100 transition-opacity"
              :data-test="`delete-file-${index}`"
            >
              <Icon v-if="deletingFileIndex !== index" icon="heroicons:x-mark" class="w-4 h-4" />
              <span v-else class="loading loading-spinner loading-xs"></span>
            </button>
          </div>

          <!-- Document preview -->
          <div
            v-else
            class="relative flex flex-col items-center justify-center h-20 rounded border border-gray-300 bg-gray-50"
          >
            <button
              @click.prevent="$emit('preview-document', file)"
              class="flex flex-col items-center justify-center w-full h-full rounded cursor-pointer hover:bg-gray-100 transition-colors"
            >
              <Icon :icon="getFileIcon(file)" class="w-8 h-8 text-gray-600" />
              <span class="text-xs text-gray-500 mt-1 truncate w-full text-center px-1">
                {{ file.fileName }}
              </span>
            </button>
            <button
              @click.prevent="$emit('delete-file', index)"
              :disabled="deletingFileIndex === index"
              class="absolute top-1 right-1 btn btn-xs btn-circle btn-error opacity-0 group-hover:opacity-100 transition-opacity"
              :data-test="`delete-file-${index}`"
            >
              <Icon v-if="deletingFileIndex !== index" icon="heroicons:x-mark" class="w-4 h-4" />
              <span v-else class="loading loading-spinner loading-xs"></span>
            </button>
          </div>
        </div>
      </div>
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
import { Icon } from '@iconify/vue'
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
  'preview-image': [file: FileData]
  'preview-document': [file: FileData]
}>()

const uploadFileRef = ref<InstanceType<typeof UploadFileDB> | null>(null)
const uploadedFiles = ref<File[]>([])

const onFilesUpdate = (files: File[]): void => {
  uploadedFiles.value = files
}

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

// File helper functions for existing files display
const getFileDataUrl = (file: FileData): string => {
  return `data:${file.fileType};base64,${file.fileData}`
}

const isImageFile = (file: FileData): boolean => {
  return file.fileType.startsWith('image/')
}

const getFileIcon = (file: FileData): string => {
  if (file.fileType === 'application/pdf') return 'heroicons:document-text'
  if (file.fileType.includes('zip')) return 'heroicons:archive-box'
  if (file.fileType.includes('word')) return 'heroicons:document'
  return 'heroicons:document'
}

const handleSubmit = async () => {
  v$.value.$touch()
  if (v$.value.$invalid) return

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
