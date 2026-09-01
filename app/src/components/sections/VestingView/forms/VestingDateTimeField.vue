<template>
  <UFormField :name="name" :label="label" :help="help" required>
    <div class="flex flex-col gap-2 sm:flex-row">
      <UPopover v-model:open="calendarOpen" class="min-w-0 flex-1">
        <UButton
          type="button"
          color="neutral"
          variant="outline"
          icon="i-lucide-calendar"
          class="w-full justify-start font-normal"
          :label="day ? formatDate(day) : 'Pick a day'"
          :data-test="`${testId}-date`"
        />
        <template #content>
          <UCalendar
            :model-value="calendarDay"
            @update:model-value="selectDay($event as CalendarDate | null)"
          />
        </template>
      </UPopover>

      <UInputTime
        :model-value="timeValue"
        class="w-full sm:w-40"
        :aria-label="`${label} time`"
        :data-test="`${testId}-time`"
        @update:model-value="updateTime"
      >
        <template #trailing><span class="text-muted text-xs font-semibold">Local</span></template>
      </UInputTime>
    </div>

    <p v-if="value" class="text-muted mt-1 text-xs" :data-test="`${testId}-utc`">
      = {{ formatDateUtc(value) }}
    </p>
  </UFormField>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { CalendarDate, Time, getLocalTimeZone } from '@internationalized/date'
import { dateToCalendarDate } from '@/utils/dates/calendar'
import { formatDate, formatDateUtc } from '@/utils/format'

interface Props {
  name: string
  label: string
  help: string
  testId: string
  day: Date | null
  time: string
  value: Date | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:day': [value: Date]
  'update:time': [value: string]
}>()

const calendarOpen = ref(false)
const calendarDay = computed(() => (props.day ? dateToCalendarDate(props.day) : undefined))
const timeValue = computed(() => {
  if (!props.time) return undefined
  const [hour, minute] = props.time.split(':').map(Number)
  return new Time(hour || 0, minute || 0)
})

function selectDay(value: CalendarDate | null) {
  if (!value) return
  emit('update:day', value.toDate(getLocalTimeZone()))
  calendarOpen.value = false
}

function updateTime(value: unknown) {
  if (!value || typeof value !== 'object' || !('hour' in value) || !('minute' in value)) return
  const pad = (part: number) => String(part).padStart(2, '0')
  emit('update:time', `${pad(Number(value.hour))}:${pad(Number(value.minute))}`)
}
</script>
