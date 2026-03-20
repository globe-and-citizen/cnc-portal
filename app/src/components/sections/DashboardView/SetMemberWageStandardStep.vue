<template>
  <div class="space-y-4" data-test="standard-wage-step">
    <div>
      <label class="input input-bordered flex items-center gap-2 input-md w-full">
        <span class="w-40">Max Weekly Hours</span>
        |
        <input
          type="text"
          class="grow"
          v-model="wageData.maxWeeklyHours"
          placeholder="Enter max hours per week..."
          data-test="max-hours-input"
        />
      </label>
      <div
        data-test="max-weekly-hours-error"
        class="text-red-500 text-sm w-full text-left"
        v-for="error of maxWeeklyHoursErrors"
        :key="error.$uid"
      >
        {{ error.$message }}
      </div>
    </div>

    <div class="mb-4">
      <h3 class="text-lg font-semibold mb-4">Hourly Rates</h3>
      <div class="flex flex-col gap-6">
        <div v-for="field in rateFieldConfigs" :key="field.key" class="space-y-2">
          <div class="flex items-center gap-4">
            <USwitch
              v-model="wageData.standardRates[field.enabledKey]"
              color="primary"
              :data-test="field.standardToggleTest"
            />

            <div class="relative w-full">
              <input
                :disabled="!wageData.standardRates[field.enabledKey]"
                type="text"
                class="input input-bordered w-full rounded-xl pr-16"
                v-model="wageData.standardRates[field.amountKey]"
                :placeholder="
                  wageData.standardRates[field.enabledKey] ? field.activePlaceholder : field.label
                "
                :data-test="field.standardInputTest"
                style="min-width: 220px"
              />
              <span
                class="absolute right-4 top-1/2 -translate-y-1/2"
                :class="
                  wageData.standardRates[field.enabledKey]
                    ? 'badge badge-primary font-bold'
                    : 'badge badge-ghost text-gray-400'
                "
                style="transition: all 0.2s; pointer-events: none"
              >
                {{ field.label }}
              </span>
            </div>
          </div>
          <div
            :data-test="field.standardErrorTest"
            class="text-red-500 text-sm w-full text-left"
            v-for="error of standardRateErrors[field.amountKey]"
            :key="error.$uid"
          >
            {{ error.$message }}
          </div>
        </div>
      </div>
    </div>

    <div
      data-test="rate-per-hour-error"
      class="text-red-500 text-sm w-full text-left"
      v-for="error of ratePerHourErrors"
      :key="error.$uid"
    >
      {{ error.$message }}
    </div>

    <div class="border-t border-base-200 pt-4">
      <label
        class="flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-4 transition"
        :class="
          wageData.enableOvertimeRules
            ? 'border-emerald-400 bg-emerald-50/60'
            : 'border-base-200 bg-base-100'
        "
        data-test="enable-overtime-card"
      >
        <UCheckbox
          v-model="wageData.enableOvertimeRules"
          color="success"
          class="mt-1"
          data-test="enable-overtime-checkbox"
        />
        <div>
          <p class="font-semibold">Enable overtime rules</p>
          <p class="text-sm text-base-content/60">
            Define a custom wage for hours worked beyond the weekly limit.
          </p>
        </div>
      </label>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Ref } from 'vue'
import type { RateFieldConfig, RateFormKey, WageFormState } from '@/types'

interface ValidationError {
  $uid: string
  $message: string | Ref<string>
}

const wageData = defineModel<WageFormState>('wageData', { required: true })

defineProps<{
  rateFieldConfigs: RateFieldConfig[]
  maxWeeklyHoursErrors: ValidationError[]
  standardRateErrors: Record<RateFormKey, ValidationError[]>
  ratePerHourErrors: ValidationError[]
}>()
</script>
