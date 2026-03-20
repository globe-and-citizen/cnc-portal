<template>
  <div class="space-y-4" data-test="overtime-rules-step">
    <UAlert
      color="success"
      variant="soft"
      class="rounded-2xl border border-emerald-300"
      data-test="overtime-banner"
    >
      <template #description>
        <p class="mt-2 text-emerald-900">
          Hours beyond
          <span class="font-semibold">{{ wageData.maxWeeklyHours }} hrs/wk</span> will be paid at
          the rates below, instead of the standard rates.
        </p>
      </template>
    </UAlert>

    <div>
      <label class="input input-bordered flex items-center gap-2 input-md w-full">
        <span class="w-40">Overtime Hours</span>
        |
        <input
          type="text"
          class="grow"
          v-model="wageData.maximumOvertimeHoursPerWeek"
          placeholder="Enter overtime hours per week..."
          data-test="overtime-hours-input"
        />
      </label>
      <div
        data-test="overtime-hours-error"
        class="text-red-500 text-sm w-full text-left"
        v-for="error of overtimeHoursErrors"
        :key="error.$uid"
      >
        {{ error.$message }}
      </div>
    </div>

    <div class="mb-6">
      <h3 class="text-lg font-semibold mb-4">Overtime Hourly Rates</h3>
      <div class="flex flex-col gap-6">
        <div v-for="field in rateFieldConfigs" :key="`overtime-${field.key}`" class="space-y-2">
          <div class="flex items-center gap-4">
            <USwitch
              v-model="wageData.overtimeRates[field.enabledKey]"
              color="primary"
              :data-test="field.overtimeToggleTest"
            />
            <div class="relative w-full">
              <input
                :disabled="!wageData.overtimeRates[field.enabledKey]"
                type="text"
                class="input input-bordered w-full rounded-xl pr-16"
                v-model="wageData.overtimeRates[field.amountKey]"
                :placeholder="
                  wageData.overtimeRates[field.enabledKey] ? field.activePlaceholder : field.label
                "
                :data-test="field.overtimeInputTest"
                style="min-width: 220px"
              />
              <span
                class="absolute right-4 top-1/2 -translate-y-1/2"
                :class="
                  wageData.overtimeRates[field.enabledKey]
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
            :data-test="field.overtimeErrorTest"
            class="text-red-500 text-sm w-full text-left"
            v-for="error of overtimeRateErrors[field.amountKey]"
            :key="error.$uid"
          >
            {{ error.$message }}
          </div>
        </div>
      </div>
    </div>

    <div
      data-test="overtime-rate-per-hour-error"
      class="text-red-500 text-sm w-full text-left"
      v-for="error of overtimeRatePerHourErrors"
      :key="error.$uid"
    >
      {{ error.$message }}
    </div>

    <div class="grid gap-4 md:grid-cols-2">
      <div
        class="min-h-40 rounded-2xl border border-base-300 bg-base-100 px-5 py-5"
        data-test="standard-rate-recap"
      >
        <p class="text-sm font-semibold uppercase tracking-[0.2em] text-base-content/50">
          Standard
        </p>
        <div class="mt-3 space-y-2">
          <p
            v-for="summaryItem in standardRateSummary"
            :key="summaryItem"
            class="text-lg font-semibold text-base-content/80"
          >
            {{ summaryItem }}
          </p>
        </div>
      </div>
      <div
        class="min-h-40 rounded-2xl border border-emerald-300 bg-emerald-50/60 px-5 py-5"
        data-test="overtime-rate-recap"
      >
        <p class="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">Overtime</p>
        <div class="mt-3 space-y-2">
          <p
            v-for="summaryItem in overtimeRateSummary"
            :key="summaryItem"
            class="text-lg font-semibold text-emerald-700"
          >
            {{ summaryItem }}
          </p>
        </div>
      </div>
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
  overtimeHoursErrors: ValidationError[]
  overtimeRateErrors: Record<RateFormKey, ValidationError[]>
  overtimeRatePerHourErrors: ValidationError[]
  standardRateSummary: string[]
  overtimeRateSummary: string[]
}>()
</script>
