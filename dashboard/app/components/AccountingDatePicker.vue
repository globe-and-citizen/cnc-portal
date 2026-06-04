<script setup lang="ts">
import { CalendarDate, getLocalTimeZone } from '@internationalized/date'
import { useDatePicker } from '~/composables/useDatePicker'
import type { DatePickerMode, DatePickerValue } from '~/utils/datePicker'

/**
 * Dual-mode accounting date picker.
 *
 * - `mode="date"` selects a single "as of" date (Balance Sheet, Positions, …); `v-model` is a `Date`.
 * - `mode="range"` selects a from/to period (Income Statement, Ledger, …); `v-model` is a `Range`.
 *
 * Presets come first with ◀ / ▶ steppers; the free calendar / date inputs are the fallback.
 * All date logic lives in `~/utils/datePicker`, all reactive state in `~/composables/useDatePicker`.
 */
const props = withDefaults(defineProps<{ mode?: DatePickerMode }>(), { mode: 'date' })

const model = defineModel<DatePickerValue>()

const {
  presets,
  activePreset,
  triggerLabel,
  isCustomRangeValid,
  customDate,
  customStartInput,
  customEndInput,
  select,
  step,
  anchorLabel,
  isActive
} = useDatePicker(props.mode, model)

// @internationalized/date interop for the single Specific-date UCalendar.
const calendarDate = computed({
  get: () => {
    const d = customDate.value
    return new CalendarDate(d.getFullYear(), d.getMonth() + 1, d.getDate())
  },
  set: (value: CalendarDate) => {
    customDate.value = value.toDate(getLocalTimeZone())
    select('specific')
  }
})
</script>

<template>
  <UPopover :content="{ align: 'start' }">
    <UButton
      color="neutral"
      variant="ghost"
      icon="i-lucide-calendar"
      class="data-[state=open]:bg-elevated group"
    >
      <span class="truncate">{{ triggerLabel }}</span>

      <template #trailing>
        <UIcon
          name="i-lucide-chevron-down"
          class="shrink-0 text-dimmed size-5 group-data-[state=open]:rotate-180 transition-transform duration-200"
        />
      </template>
    </UButton>

    <template #content>
      <div class="w-fit min-w-80 p-1.5">
        <div
          v-for="preset in presets"
          :key="preset.id"
          class="flex items-center justify-between gap-2 rounded-md pr-1"
          :class="isActive(preset.id) ? 'bg-elevated' : 'hover:bg-elevated/50'"
        >
          <button
            type="button"
            class="flex grow items-center gap-2 px-2 py-1.5 text-left text-sm"
            @click="select(preset.id)"
          >
            <UIcon
              name="i-lucide-check"
              class="size-4 shrink-0 text-primary"
              :class="isActive(preset.id) ? 'opacity-100' : 'opacity-0'"
            />
            {{ preset.label }}
          </button>

          <div v-if="preset.unit" class="flex shrink-0 items-center gap-1">
            <UButton
              icon="i-lucide-chevron-left"
              color="neutral"
              variant="ghost"
              size="xs"
              :aria-label="`Previous ${preset.unit}`"
              @click="step(preset, -1)"
            />
            <span class="w-32 text-center text-sm tabular-nums">{{ anchorLabel(preset) }}</span>
            <UButton
              icon="i-lucide-chevron-right"
              color="neutral"
              variant="ghost"
              size="xs"
              :aria-label="`Next ${preset.unit}`"
              @click="step(preset, 1)"
            />
          </div>
        </div>

        <!-- Presets first, free inputs last. -->
        <div v-if="activePreset.id === 'specific'" class="mt-1 border-t border-default pt-2">
          <UCalendar v-model="calendarDate" />
        </div>
        <div v-else-if="activePreset.id === 'custom'" class="mt-1 space-y-2 border-t border-default px-2 pt-2">
          <UFormField label="From" size="sm">
            <UInput v-model="customStartInput" type="date" class="w-full" />
          </UFormField>
          <UFormField label="To" size="sm">
            <UInput v-model="customEndInput" type="date" class="w-full" />
          </UFormField>
          <p v-if="!isCustomRangeValid" class="text-sm text-error">
            The start date must be on or before the end date.
          </p>
        </div>
      </div>
    </template>
  </UPopover>
</template>
