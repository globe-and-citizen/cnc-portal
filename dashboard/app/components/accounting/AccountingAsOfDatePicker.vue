<script setup lang="ts">
import { CalendarDate, DateFormatter, getLocalTimeZone, today } from '@internationalized/date'
import type { Range } from '~/types'

const selected = defineModel<Range | null>({ required: true })

const df = new DateFormatter('en-US', { dateStyle: 'medium' })
const tz = getLocalTimeZone()
const maxDate = today(tz)

function toCalendarDate(date: Date): CalendarDate {
  return new CalendarDate(date.getFullYear(), date.getMonth() + 1, date.getDate())
}

const calendarRange = computed({
  get: () => {
    const value = selected.value
    if (!value) {
      return { start: maxDate, end: maxDate }
    }
    return {
      start: toCalendarDate(value.start),
      end: toCalendarDate(value.end)
    }
  },
  set: (newValue: { start: CalendarDate | null, end: CalendarDate | null }) => {
    if (!newValue.start || !newValue.end) {
      return
    }
    const next: Range = {
      start: newValue.start.toDate(tz),
      end: newValue.end.toDate(tz)
    }
    const current = selected.value
    if (
      current?.start.getTime() === next.start.getTime()
      && current?.end.getTime() === next.end.getTime()
    ) {
      return
    }
    selected.value = next
  }
})

const label = computed(() => {
  const value = selected.value
  if (!value) {
    return 'Pick a date'
  }
  const { start, end } = value
  if (start.getTime() === end.getTime()) {
    return df.format(start)
  }
  return `${df.format(start)} - ${df.format(end)}`
})
</script>

<template>
  <UPopover :content="{ align: 'end' }">
    <UButton
      color="neutral"
      variant="subtle"
      size="sm"
      icon="i-lucide-calendar"
    >
      {{ label }}
    </UButton>

    <template #content>
      <UCalendar
        v-model="calendarRange"
        class="p-2"
        :max-value="maxDate"
        range
      />
    </template>
  </UPopover>
</template>
