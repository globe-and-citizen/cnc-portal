<template>
  <div class="flex flex-col gap-4.5">
    <div class="grid grid-cols-2 gap-4">
      <div>
        <label class="mb-1.5 block text-sm font-medium" for="cc-rate">
          Interest rate (fixed, over the term)
        </label>
        <UInput
          id="cc-rate"
          v-model="form.rate"
          type="number"
          min="0"
          :color="termErrors.rate ? 'error' : undefined"
          placeholder="6"
          class="w-full"
          data-test="cc-rate"
        >
          <template #trailing><span class="text-muted text-sm font-bold">%</span></template>
        </UInput>
        <p v-if="termErrors.rate" class="text-error mt-1 text-xs" data-test="cc-rate-error">
          {{ termErrors.rate }}
        </p>
      </div>
      <div>
        <label class="mb-1.5 block text-sm font-medium" for="cc-deadline">
          Subscription deadline
        </label>
        <div class="flex gap-2">
          <UPopover v-model:open="deadlineOpen" class="flex-1">
            <UButton
              id="cc-deadline"
              variant="outline"
              color="neutral"
              :class="['w-full justify-start font-normal', termErrors.deadline && 'ring-error ring-1']"
              :label="deadlineLabel"
              data-test="cc-deadline"
            />
            <template #content>
              <UCalendar
                :model-value="deadlineCalendarDate"
                :min-value="minDeadlineDate"
                @update:model-value="(val) => onSelectDeadlineDate(val as CalendarDate | null)"
              />
            </template>
          </UPopover>
          <UInput
            :model-value="localDeadline.time"
            type="time"
            class="w-40 shrink-0"
            data-test="cc-deadline-time"
            @update:model-value="(val) => onLocalTimeInput(String(val ?? ''))"
          >
            <template #trailing><span class="text-muted text-xs font-bold">Local</span></template>
          </UInput>
        </div>
        <p class="text-muted mt-1 text-xs" data-test="cc-deadline-utc-readout">
          = {{ deadlineUtcReadout }}
        </p>
        <p v-if="termErrors.deadline" class="text-error mt-1 text-xs" data-test="cc-deadline-error">
          {{ termErrors.deadline }}
        </p>
        <p
          v-if="termErrors.deadlineTime"
          class="text-error mt-1 text-xs"
          data-test="cc-deadline-time-error"
        >
          {{ termErrors.deadlineTime }}
        </p>
      </div>
    </div>

    <div>
      <label id="cc-term-label" class="mb-1.5 block text-sm font-medium">Term length</label>
      <div class="flex flex-wrap gap-2" role="radiogroup" aria-labelledby="cc-term-label">
        <button
          v-for="p in PRESETS"
          :key="p"
          type="button"
          role="radio"
          :aria-checked="form.period === p && form.periodMode !== 'custom'"
          :class="creditChipClass(form.period === p && form.periodMode !== 'custom')"
          :data-test="`cc-term-${p}`"
          @click="selectPreset(p)"
        >
          {{ p }} days
        </button>
        <button
          type="button"
          role="radio"
          :aria-checked="form.periodMode === 'custom'"
          :class="creditChipClass(form.periodMode === 'custom')"
          data-test="cc-term-custom"
          @click="enterCustom"
        >
          Custom…
        </button>
      </div>

      <div v-if="form.periodMode === 'custom'" class="mt-2.5 flex items-stretch gap-2.5">
        <!-- One-way bind + recalcPeriod as the sole writer, not v-model plus a
             separate @input reading form.periodVal back — that combination could
             read a stale value depending on event order through UInput's wrapper,
             computing `period` off the previous keystroke's digits. -->
        <UInput
          :model-value="form.periodVal"
          type="number"
          min="1"
          placeholder="180"
          class="max-w-30"
          data-test="cc-term-value"
          @update:model-value="(val) => recalcPeriod(String(val ?? ''), form.periodUnit)"
        />
        <div
          class="border-default bg-muted flex max-w-[260px] flex-1 gap-0.5 rounded-lg border p-0.5"
          role="radiogroup"
          aria-label="Custom term unit"
        >
          <button
            v-for="u in UNITS"
            :key="u.value"
            type="button"
            role="radio"
            :aria-checked="form.periodUnit === u.value"
            :class="unitClass(form.periodUnit === u.value)"
            :data-test="`cc-unit-${u.value}`"
            @click="recalcPeriod(form.periodVal, u.value)"
          >
            {{ u.label }}
          </button>
        </div>
      </div>
      <p v-if="termErrors.period" class="text-error mt-1.5 text-xs" data-test="cc-term-error">
        {{ termErrors.period }}
      </p>
    </div>

    <UAlert
      color="info"
      variant="soft"
      icon="heroicons:information-circle"
      :title="preview.title"
      :description="preview.body"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { CalendarDate, getLocalTimeZone, today } from '@internationalized/date'
import { applyZodFieldErrors, creditChipClass, creditTermLabel, formatAmount } from '@/utils'
import { createCreditCallTermsSchema, type CreditCallForm, type CreditTermUnit } from '@/types'

const form = defineModel<CreditCallForm>('form', { required: true })

const termErrors = reactive<Record<string, string>>({})

function validate(): boolean {
  const schema = createCreditCallTermsSchema({
    today: new Date().toISOString().slice(0, 10),
    now: new Date()
  })
  const result = schema.safeParse({
    rate: form.value.rate,
    deadline: form.value.deadline,
    deadlineTime: form.value.deadlineTime,
    period: form.value.period
  })
  return applyZodFieldErrors(result, termErrors)
}

defineExpose({ validate })

// `form.deadline`/`form.deadlineTime` remain UTC everywhere else in the app (schema
// validation, on-chain submission via toUnixSeconds, CreditCallSummaryCard) — unchanged.
// The two converters below exist only so THIS input can show/accept the browser's local
// wall-clock time instead: a tester coordinating across timezones (e.g. Vietnam and
// Togo) can type their own local time directly instead of converting to UTC by hand,
// while what's actually submitted never changes meaning. `localDeadline` below is the
// single derived view both the calendar and time input read from and write through.
function utcToLocalParts(dateStr: string, timeStr: string): { date: string; time: string } {
  const utc = new Date(`${dateStr}T${timeStr || '00:00'}:00Z`)
  if (isNaN(utc.getTime())) return { date: '', time: '' }
  const pad = (n: number) => String(n).padStart(2, '0')
  return {
    date: `${utc.getFullYear()}-${pad(utc.getMonth() + 1)}-${pad(utc.getDate())}`,
    time: `${pad(utc.getHours())}:${pad(utc.getMinutes())}`
  }
}

function localPartsToUtc(dateStr: string, timeStr: string): { date: string; time: string } {
  const [year, month, day] = dateStr.split('-').map(Number)
  const [hour, minute] = (timeStr || '00:00').split(':').map(Number)
  if (!year || !month || !day) return { date: dateStr, time: timeStr }
  const local = new Date(year, month - 1, day, hour || 0, minute || 0)
  const pad = (n: number) => String(n).padStart(2, '0')
  return {
    date: `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())}`,
    time: `${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}`
  }
}

const localDeadline = computed(() => utcToLocalParts(form.value.deadline, form.value.deadlineTime))

/** Live "what this actually means" readout — the manual fields above show local time,
 *  so this is the one place that keeps the real UTC value visible at a glance, same
 *  transparency principle as the "UTC" label used elsewhere in this wizard. */
const deadlineUtcReadout = computed(() =>
  form.value.deadline ? `${form.value.deadline} ${form.value.deadlineTime || '00:00'} UTC` : ''
)

function applyLocalDeadline(dateStr: string, timeStr: string) {
  const utc = localPartsToUtc(dateStr, timeStr)
  form.value.deadline = utc.date
  form.value.deadlineTime = utc.time
}

// `form.deadline` is a plain YYYY-MM-DD string (no timezone) — converted directly
// to/from CalendarDate's own (year, month, day) fields rather than round-tripping
// through a JS Date, which would shift the displayed day in non-UTC timezones.
function deadlineToCalendarDate(dateStr: string): CalendarDate | undefined {
  const parts = dateStr.split('-').map(Number)
  if (parts.length !== 3 || parts.some(Number.isNaN)) return undefined
  const [year, month, day] = parts as [number, number, number]
  return new CalendarDate(year, month, day)
}

function calendarDateToDeadline(date: CalendarDate): string {
  return `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`
}

const deadlineOpen = ref(false)
const minDeadlineDate = today(getLocalTimeZone())
const deadlineCalendarDate = computed(() => deadlineToCalendarDate(localDeadline.value.date))
const deadlineLabel = computed(() => {
  const cd = deadlineCalendarDate.value
  if (!cd) return 'Select a date'
  return `${cd.toDate(getLocalTimeZone()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
})

function onSelectDeadlineDate(value: CalendarDate | null | undefined) {
  if (!value) return
  applyLocalDeadline(calendarDateToDeadline(value), localDeadline.value.time)
  deadlineOpen.value = false
}

function onLocalTimeInput(timeStr: string) {
  applyLocalDeadline(localDeadline.value.date, timeStr)
}

const PRESETS = [30, 60, 90, 120]
const UNITS: { value: CreditTermUnit; label: string }[] = [
  { value: 'days', label: 'Days' },
  { value: 'weeks', label: 'Weeks' },
  { value: 'months', label: 'Months' },
  { value: 'years', label: 'Years' }
]
const DAYS_PER_UNIT: Record<CreditTermUnit, number> = {
  days: 1,
  weeks: 7,
  months: 30,
  years: 365
}

function selectPreset(days: number) {
  form.value.period = days
  form.value.periodMode = 'preset'
}

function enterCustom() {
  form.value.periodMode = 'custom'
  form.value.periodVal = form.value.periodVal || String(form.value.period)
}

/** Convert a custom value + unit into whole days and keep the form in sync. */
function recalcPeriod(value: string, unit: CreditTermUnit) {
  form.value.periodMode = 'custom'
  form.value.periodVal = value
  form.value.periodUnit = unit
  form.value.period = Math.max(0, Math.round((Number(value) || 0) * DAYS_PER_UNIT[unit]))
}

function unitClass(active: boolean) {
  return [
    'flex-1 cursor-pointer rounded-md py-1.5 text-center text-xs font-semibold transition-colors select-none',
    active ? 'bg-default text-primary shadow-xs' : 'text-muted'
  ]
}

const termLabel = computed(() => creditTermLabel(form.value))

const preview = computed(() => {
  const f = form.value
  const target = Number(f.target) || 0
  const rate = Number(f.rate) || 0
  const repay = target * (1 + rate / 100)
  return {
    title: `Repay ${formatAmount(repay, f.token)} at maturity`,
    body: `On a ${formatAmount(target, f.token)} target at ${rate}%, you return ${formatAmount(
      (target * rate) / 100,
      f.token
    )} in interest, ${termLabel.value} after funding.`
  }
})
</script>
