<template>
  <UForm ref="formRef" :schema="schema" :state="form" class="flex flex-col gap-5">
    <section class="flex flex-col gap-2">
      <div class="text-xs font-bold tracking-widest text-[#9aaba2] uppercase">
        Repayment timeline
      </div>
      <div
        class="flex items-center gap-3 rounded-xl border border-[#d6f1e6] bg-[#f0fbf6] px-3 py-2"
      >
        <div
          class="bg-primary flex h-8 w-8 flex-none items-center justify-center rounded-lg text-white"
        >
          <UIcon name="heroicons:chart-bar" class="size-4" />
        </div>
        <div class="flex-1">
          <div class="flex items-center gap-2 text-sm font-bold text-[#0f3d2e]">
            Bullet — lump sum at maturity
            <UBadge color="success" variant="soft" size="xs">MVP</UBadge>
          </div>
          <div class="text-xs text-[#5b6e64]">
            Principal + all accrued interest repaid as one payment at end of term.
          </div>
        </div>
      </div>

      <hr class="border-t border-[#eef3f0]" />

      <div class="grid grid-cols-2 gap-3">
        <UFormField label="Start date" name="startDate">
          <UInput
            v-model="form.startDate"
            type="date"
            class="w-full"
            data-test="offering-start-date-input"
          />
        </UFormField>
        <UFormField label="Subscription deadline" name="deadline">
          <UInput
            v-model="form.deadline"
            type="date"
            class="w-full"
            data-test="offering-deadline-input"
          />
        </UFormField>
      </div>

      <UFormField label="Term length" name="termValue" :ui="{ label: 'text-base font-bold' }">
        <div class="mb-2 flex items-center gap-2">
          <span class="text-xs font-semibold text-[#46584f]">Unit</span>
          <USelect
            :model-value="form.termUnit"
            :items="unitOptions"
            size="xs"
            class="h-8 w-28"
            data-test="term-unit-select"
            @update:model-value="selectUnit"
          />
        </div>
        <div class="grid grid-cols-4 gap-2">
          <button
            v-for="value in termPresets"
            :key="value"
            type="button"
            :class="pickerClass(!isCustomTerm && form.termValue === value)"
            data-test="term-preset-button"
            @click="selectTermPreset(value)"
          >
            <span class="text-sm font-bold">{{ value }}</span>
          </button>
        </div>
        <div class="mt-2 flex items-center gap-2">
          <span class="text-xs font-semibold text-[#46584f]">Custom</span>
          <USwitch v-model="isCustomTerm" data-test="term-custom-toggle" />
          <UFormField v-if="isCustomTerm" class="max-w-40">
            <UInput
              type="number"
              :model-value="form.termValue"
              :max="maxByUnit[form.termUnit]"
              class="w-full"
              data-test="offering-term-input"
              @update:model-value="(v) => (form.termValue = Number(v))"
            >
              <template #trailing>
                <span class="text-muted text-xs font-semibold">{{ form.termUnit }}</span>
              </template>
            </UInput>
          </UFormField>
          <span v-if="isCustomTerm" class="text-[10px] text-[#9aaba2]"
            >max {{ maxByUnit[form.termUnit] }}</span
          >
        </div>
      </UFormField>
    </section>

    <hr class="border-t border-[#eef3f0]" />

    <section class="flex flex-col gap-2">
      <div
        class="flex items-center justify-between gap-3 rounded-xl border border-[#eef3f0] px-3 py-3"
      >
        <div>
          <div class="text-sm font-bold text-[#0f3d2e]">Cap the amount per lender</div>
          <div class="text-xs text-[#9aaba2]">
            Optional — keeps any single lender from dominating the round.
          </div>
        </div>
        <USwitch v-model="form.capOn" data-test="cap-toggle" />
      </div>
      <UFormField v-if="form.capOn" label="Maximum per lender" name="cap" class="max-w-60">
        <UInput
          type="number"
          :model-value="form.cap"
          class="w-full"
          data-test="offering-cap-input"
          @update:model-value="(v) => (form.cap = Number(v))"
        >
          <template #trailing
            ><span class="text-muted text-xs font-semibold">{{ form.token }}</span></template
          >
        </UInput>
      </UFormField>
    </section>
  </UForm>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { z } from 'zod'
import type { OfferingForm, TermUnit } from '@/types'
import { pickerClass } from '@/utils'

const form = defineModel<OfferingForm>('form', { required: true })

const unitOptions: { label: string; value: TermUnit }[] = [
  { label: 'Days', value: 'days' },
  { label: 'Months', value: 'months' },
  { label: 'Years', value: 'years' }
]

const presetsByUnit: Record<TermUnit, number[]> = {
  days: [30, 60, 90, 120],
  months: [6, 12, 18, 24],
  years: [1, 2, 3]
}

const unitDefaults: Record<TermUnit, number> = { days: 90, months: 12, years: 1 }
const maxByUnit: Record<TermUnit, number> = { days: 365, months: 120, years: 30 }

const termPresets = computed(() => presetsByUnit[form.value.termUnit])
const isCustomTerm = ref(!termPresets.value.includes(form.value.termValue))

function selectUnit(unit: TermUnit) {
  form.value.termUnit = unit
  form.value.termValue = unitDefaults[unit]
  isCustomTerm.value = false
}

function selectTermPreset(value: number) {
  form.value.termValue = value
  isCustomTerm.value = false
}

const schema = computed(() =>
  z
    .object({
      startDate: z.string().min(1, 'Start date is required'),
      deadline: z.string().min(1, 'Subscription deadline is required'),
      termValue: z
        .number({ error: 'Term is required' })
        .int('Term must be a whole number')
        .positive('Term must be greater than 0'),
      cap: z.number().optional()
    })
    .refine((data) => data.startDate >= new Date().toISOString().slice(0, 10), {
      message: 'Start date cannot be in the past',
      path: ['startDate']
    })
    .refine((data) => data.deadline >= new Date().toISOString().slice(0, 10), {
      message: 'Subscription deadline cannot be in the past',
      path: ['deadline']
    })
    .refine((data) => new Date(data.deadline) <= new Date(data.startDate), {
      message: 'Deadline must be on or before the start date',
      path: ['deadline']
    })
    .refine((data) => data.termValue <= maxByUnit[form.value.termUnit], {
      message: `Term cannot exceed ${maxByUnit[form.value.termUnit]} ${form.value.termUnit}`,
      path: ['termValue']
    })
    .refine((data) => !form.value.capOn || (typeof data.cap === 'number' && data.cap > 0), {
      message: 'Enter a maximum amount per lender',
      path: ['cap']
    })
    .refine(
      (data) =>
        !form.value.capOn || typeof data.cap !== 'number' || data.cap <= form.value.principal,
      {
        message: 'Cap cannot exceed the principal target',
        path: ['cap']
      }
    )
)

const formRef = ref<{ validate: () => Promise<unknown> } | null>(null)
defineExpose({ validate: () => formRef.value!.validate() })
</script>
