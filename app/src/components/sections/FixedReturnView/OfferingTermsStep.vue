<template>
  <UForm ref="formRef" :schema="schema" :state="form" class="flex flex-col gap-5">
    <section class="flex flex-col gap-2">
      <div class="text-xs font-bold tracking-widest text-[#9aaba2] uppercase">
        Repayment timeline
      </div>
      <UAlert
        color="success"
        variant="soft"
        icon="heroicons:chart-bar"
        description="Principal and all accrued interest are repaid as one payment at the end of the term."
      >
        <template #title>
          <div class="flex items-center gap-2">
            Bullet — lump sum at maturity
            <UBadge color="success" variant="soft" size="xs">MVP</UBadge>
          </div>
        </template>
      </UAlert>

      <USeparator />

      <UFormField
        label="Subscription deadline"
        name="deadline"
        description="Last day lenders can commit funds. The loan term starts on this date."
      >
        <UInput
          :model-value="form.deadline"
          type="date"
          class="w-full"
          data-test="offering-deadline-input"
          @update:model-value="(value: unknown) => updateStringField(value)"
        />
      </UFormField>

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
          <UButton
            v-for="value in termPresets"
            :key="value"
            type="button"
            block
            color="primary"
            :variant="!isCustomTerm && form.termValue === value ? 'solid' : 'outline'"
            :label="String(value)"
            data-test="term-preset-button"
            @click="selectTermPreset(value)"
          />
        </div>
        <div class="mt-2 flex items-center gap-2">
          <span class="text-xs font-semibold text-[#46584f]">Custom</span>
          <USwitch v-model="isCustomTerm" data-test="term-custom-toggle" />
          <UFormField v-if="isCustomTerm" class="max-w-40">
            <UInput
              type="number"
              :model-value="form.termValue"
              :max="OFFERING_TERM_MAXIMUMS[form.termUnit]"
              class="w-full"
              data-test="offering-term-input"
              @update:model-value="(v: unknown) => (form.termValue = Number(v))"
            >
              <template #trailing>
                <span class="text-muted text-xs font-semibold">{{ form.termUnit }}</span>
              </template>
            </UInput>
          </UFormField>
          <span v-if="isCustomTerm" class="text-[10px] text-[#9aaba2]"
            >max {{ OFFERING_TERM_MAXIMUMS[form.termUnit] }}</span
          >
        </div>
      </UFormField>
    </section>

    <USeparator />

    <section class="flex flex-col gap-2">
      <UCard variant="subtle" :ui="{ body: 'flex items-center justify-between gap-3 px-3 py-3' }">
        <div>
          <div class="text-sm font-bold text-[#0f3d2e]">Cap the amount per lender</div>
          <div class="text-xs text-[#9aaba2]">
            Optional — keeps any single lender from dominating the round.
          </div>
        </div>
        <USwitch
          :model-value="form.capOn"
          data-test="cap-toggle"
          @update:model-value="updateCapEnabled"
        />
      </UCard>
      <UFormField v-if="form.capOn" label="Maximum per lender" name="cap" class="max-w-60">
        <UInput
          type="number"
          :model-value="form.cap"
          class="w-full"
          data-test="offering-cap-input"
          @update:model-value="(v: unknown) => (form.cap = Number(v))"
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
import { createOfferingTermsSchema, type OfferingForm, type TermUnit } from '@/types'
import { OFFERING_TERM_DEFAULTS, OFFERING_TERM_MAXIMUMS, OFFERING_TERM_PRESETS } from '@/utils'

const form = defineModel<OfferingForm>('form', { required: true })

const unitOptions: { label: string; value: TermUnit }[] = [
  { label: 'Days', value: 'days' },
  { label: 'Months', value: 'months' },
  { label: 'Years', value: 'years' }
]

const termPresets = computed(() => OFFERING_TERM_PRESETS[form.value.termUnit])
const isCustomTerm = ref(!termPresets.value.includes(form.value.termValue))

function selectUnit(unit: TermUnit) {
  form.value.termUnit = unit
  form.value.termValue = OFFERING_TERM_DEFAULTS[unit]
  isCustomTerm.value = false
}

function selectTermPreset(value: number) {
  form.value.termValue = value
  isCustomTerm.value = false
}

function updateStringField(value: unknown) {
  form.value.deadline = String(value ?? '')
}

function updateCapEnabled(value: boolean) {
  form.value.capOn = value
}

const schema = computed(() =>
  createOfferingTermsSchema({
    today: new Date().toISOString().slice(0, 10),
    termUnit: form.value.termUnit,
    maxTerm: OFFERING_TERM_MAXIMUMS[form.value.termUnit],
    capOn: form.value.capOn,
    principal: form.value.principal
  })
)

const formRef = ref<{
  validate: (opts?: { name?: string | string[]; silent?: boolean }) => Promise<unknown>
} | null>(null)
defineExpose({ validate: () => formRef.value!.validate() })
</script>
