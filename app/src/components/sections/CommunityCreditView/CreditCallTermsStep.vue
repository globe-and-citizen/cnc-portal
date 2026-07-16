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
        <UInput
          id="cc-deadline"
          v-model="form.deadline"
          type="date"
          :color="termErrors.deadline ? 'error' : undefined"
          class="w-full"
          data-test="cc-deadline"
        />
        <p v-if="termErrors.deadline" class="text-error mt-1 text-xs" data-test="cc-deadline-error">
          {{ termErrors.deadline }}
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
        <UInput
          v-model="form.periodVal"
          type="number"
          min="1"
          placeholder="180"
          class="max-w-30"
          data-test="cc-term-value"
          @input="recalcPeriod(form.periodVal, form.periodUnit)"
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
import { computed, reactive } from 'vue'
import { applyZodFieldErrors, creditChipClass, formatAmount } from '@/utils'
import { createCreditCallTermsSchema, type CreditCallForm, type CreditTermUnit } from '@/types'

const form = defineModel<CreditCallForm>('form', { required: true })

const termErrors = reactive<Record<string, string>>({})

function validate(): boolean {
  const schema = createCreditCallTermsSchema({ today: new Date().toISOString().slice(0, 10) })
  const result = schema.safeParse({
    rate: form.value.rate,
    deadline: form.value.deadline,
    period: form.value.period
  })
  return applyZodFieldErrors(result, termErrors)
}

defineExpose({ validate })

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
