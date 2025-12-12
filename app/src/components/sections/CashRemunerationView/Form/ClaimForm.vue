<template>
  <div class="flex flex-col gap-4">
    <div class="flex flex-col gap-2">
      <label class="flex items-center">
        <span class="w-full" data-test="hours-worked-label">Date</span>
      </label>
      <VueDatePicker
        v-model="formData.dayWorked"
        model-type="iso"
        :format="formatUTC"
        :enable-time-picker="false"
        auto-apply
        :disabledDates="isDateDisabled"
        :ui="{
          input: 'input input-bordered input-md'
        }"
        class=""
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
import { ref, watch } from 'vue'
import { useVuelidate } from '@vuelidate/core'
import { required, numeric, minValue, maxValue, maxLength } from '@vuelidate/validators'
import type { ClaimFormData } from '@/types'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import ButtonUI from '@/components/ButtonUI.vue'

interface Props {
  initialData?: Partial<ClaimFormData>
  isEdit?: boolean
  isLoading?: boolean
  disabledWeekStarts?: string[]
}

dayjs.extend(utc)

const props = withDefaults(defineProps<Props>(), {
  isEdit: false,
  isLoading: false,
  disabledWeekStarts: () => []
})

const emit = defineEmits<{
  submit: [data: { hoursWorked: number; memo: string; dayWorked: string }]
  cancel: []
}>()

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

const isDateDisabled = (value: Date | string | null | undefined) => {
  if (!value) return false
  const date = value instanceof Date ? value : new Date(value)
  const weekStart = dayjs.utc(date).startOf('isoWeek').toISOString()
  return (props.disabledWeekStarts ?? []).includes(weekStart)
}

const handleSubmit = async () => {
  v$.value.$touch()
  if (v$.value.$invalid) return

  emit('submit', {
    hoursWorked: Number(formData.value.hoursWorked),
    memo: formData.value.memo,
    dayWorked: formData.value.dayWorked
  })
}
</script>
