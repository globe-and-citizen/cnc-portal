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
      <h4 class="mb-3 text-sm font-semibold text-gray-700">Attached Files:</h4>
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
import { ref, toRef } from 'vue'
import type { ClaimFormData } from '@/types'
import FilePreviewGallery from '@/components/sections/CashRemunerationView/Form/FilePreviewGallery.vue'
import UploadFileDB from '@/components/sections/CashRemunerationView/Form/UploadFileDB.vue'
import { useClaimForm, type ClaimFormFileData } from '@/composables/useClaimForm'

interface Props {
  initialData?: Partial<ClaimFormData>
  isEdit?: boolean
  isLoading?: boolean
  disabledWeekStarts?: string[]
  restrictSubmit?: boolean
  existingFiles?: Partial<ClaimFormFileData>[]
  deletingFileIndex?: number | null
}

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

const uploadFileRef = ref<InstanceType<typeof UploadFileDB> | null>(null)
const {
  claimSchema,
  formData,
  datePickerOpen,
  minutesOptions,
  existingFilePreviews,
  calendarDisplayDate,
  calendarValue,
  isDateDisabledFn,
  onFilesUpdate,
  onDateSelect,
  buildSubmitPayload,
  resetUploadedFiles,
  formatUTC
} = useClaimForm({
  initialData: toRef(props, 'initialData'),
  existingFiles: toRef(props, 'existingFiles'),
  disabledWeekStarts: toRef(props, 'disabledWeekStarts'),
  restrictSubmit: toRef(props, 'restrictSubmit'),
  toast
})

const handleSubmit = async () => {
  const payload = buildSubmitPayload()
  if (!payload) return
  emit('submit', payload)
}

const resetForm = () => {
  uploadFileRef.value?.resetUpload()
  resetUploadedFiles()
}

defineExpose({
  resetForm,
  formatUTC
})
</script>
