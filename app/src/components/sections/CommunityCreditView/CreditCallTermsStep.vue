<template>
  <div class="flex flex-col gap-4.5">
    <div class="grid grid-cols-2 gap-4">
      <div>
        <label class="mb-1.5 block text-sm font-medium" for="cc-rate">
          Interest rate (fixed, over the term)
        </label>
        <div class="relative">
          <input
            id="cc-rate"
            v-model="form.rate"
            type="number"
            min="0"
            :class="[CREDIT_FIELD_CLASS, 'pr-8']"
            placeholder="6"
          />
          <span class="text-muted absolute top-1/2 right-3 -translate-y-1/2 text-sm font-bold">
            %
          </span>
        </div>
      </div>
      <div>
        <label class="mb-1.5 block text-sm font-medium" for="cc-deadline">
          Subscription deadline
        </label>
        <input id="cc-deadline" v-model="form.deadline" type="date" :class="CREDIT_FIELD_CLASS" />
      </div>
    </div>

    <div>
      <label class="mb-1.5 block text-sm font-medium">Term length</label>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="p in PRESETS"
          :key="p"
          type="button"
          :class="creditChipClass(form.period === p && form.periodMode !== 'custom')"
          :data-test="`cc-term-${p}`"
          @click="selectPreset(p)"
        >
          {{ p }} days
        </button>
        <button
          type="button"
          :class="creditChipClass(form.periodMode === 'custom')"
          data-test="cc-term-custom"
          @click="enterCustom"
        >
          Custom…
        </button>
      </div>

      <div v-if="form.periodMode === 'custom'" class="mt-2.5 flex items-stretch gap-2.5">
        <input
          v-model="form.periodVal"
          type="number"
          min="1"
          placeholder="180"
          :class="[CREDIT_FIELD_CLASS, 'max-w-30']"
          data-test="cc-term-value"
          @input="recalcPeriod(form.periodVal, form.periodUnit)"
        />
        <div
          class="border-default bg-muted flex max-w-[260px] flex-1 gap-0.5 rounded-lg border p-0.5"
        >
          <button
            v-for="u in UNITS"
            :key="u.value"
            type="button"
            :class="unitClass(form.periodUnit === u.value)"
            :data-test="`cc-unit-${u.value}`"
            @click="recalcPeriod(form.periodVal, u.value)"
          >
            {{ u.label }}
          </button>
        </div>
      </div>
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
import { computed } from 'vue'
import { CREDIT_FIELD_CLASS, creditChipClass, formatAmount } from '@/utils'
import type { CreditCallForm, CreditTermUnit } from '@/types'

const form = defineModel<CreditCallForm>('form', { required: true })

const PRESETS = [30, 60, 90, 120]
const UNITS: { value: CreditTermUnit; label: string }[] = [
  { value: 'days', label: 'Days' },
  { value: 'weeks', label: 'Weeks' },
  { value: 'months', label: 'Months' },
  { value: 'years', label: 'Years' }
]
const DAYS_PER_UNIT: Record<CreditTermUnit, number> = { days: 1, weeks: 7, months: 30, years: 365 }

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

/** Friendly term label, e.g. `6 months (180 days)` for a non-day custom term. */
const termLabel = computed(() => {
  const f = form.value
  if (f.periodMode === 'custom' && f.periodUnit !== 'days' && Number(f.periodVal)) {
    const n = Number(f.periodVal)
    const unit = n === 1 ? f.periodUnit.slice(0, -1) : f.periodUnit
    return `${n} ${unit} (${f.period} days)`
  }
  return `${f.period} day${f.period === 1 ? '' : 's'}`
})

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
