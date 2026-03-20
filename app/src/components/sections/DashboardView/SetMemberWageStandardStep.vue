<template>
  <div class="space-y-4" data-test="standard-wage-step">
    <UForm :schema="schema" :wageData="wageData" class="space-y-4" @submit="onSubmit">
      <UFormField name="maxWeeklyHours">
        <UInput
          v-model="wageData.maxWeeklyHours"
          class="w-full"
          size="xl"
          type="number"
          placeholder="Enter max hours per week..."
          :ui="{
            base: 'pl-36',
            leading: 'pointer-events-none'
          }"
        >
          <template #leading> <p class="text-sm text-muted">Max Weekly Hours |</p> </template>
        </UInput></UFormField
      >
      <h3 class="text-lg font-semibold mb-4">Hourly Rates</h3>

      <UFieldGroup class="flex items-center gap-4">
        <USwitch size="xl" v-model="wageData.standardRates.nativeEnabled" />
        <UInput
          v-model="wageData.standardRates.hourlyRate"
          placeholder="0.00"
          size="xl"
          type="number"
          class="w-full"
          :disabled="!wageData.standardRates.nativeEnabled"
        >
          <template #trailing>
            <UBadge
              class="text-sm rounded-full px-4 test w-16 flex justify-center"
              :variant="wageData.standardRates.nativeEnabled ? 'solid' : 'outline'"
              :color="wageData.standardRates.nativeEnabled ? 'primary' : 'neutral'"
              >{{ NETWORK.currencySymbol }}</UBadge
            >
          </template>
        </UInput>
      </UFieldGroup>
      <UFieldGroup class="flex items-center gap-4">
        <USwitch size="xl" v-model="wageData.standardRates.usdcEnabled" />
        <UInput
          v-model="wageData.standardRates.hourlyRateUsdc"
          placeholder="0.00"
          size="xl"
          type="number"
          class="w-full"
          :disabled="!wageData.standardRates.usdcEnabled"
        >
          <template #trailing>
            <UBadge
              class="text-sm rounded-full px-4 test w-16"
              :variant="wageData.standardRates.usdcEnabled ? 'solid' : 'outline'"
              :color="wageData.standardRates.usdcEnabled ? 'primary' : 'neutral'"
              >USDC</UBadge
            >
          </template>
        </UInput>
      </UFieldGroup>

      <UFieldGroup class="flex items-center gap-4">
        <USwitch size="xl" v-model="wageData.standardRates.sherEnabled" />
        <UInput
          v-model="wageData.standardRates.hourlyRateToken"
          placeholder="0.00"
          size="xl"
          type="number"
          class="w-full"
          :disabled="!wageData.standardRates.sherEnabled"
        >
          <template #trailing>
            <UBadge
              class="text-sm rounded-full px-4 test w-16"
              :variant="wageData.standardRates.sherEnabled ? 'solid' : 'outline'"
              :color="wageData.standardRates.sherEnabled ? 'primary' : 'neutral'"
              >SHER</UBadge
            >
          </template>
        </UInput>
      </UFieldGroup>
    </UForm>

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
import type { WageFormState } from '@/types'
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import { NETWORK } from '@/constant'

const wageData = defineModel<WageFormState>('wageData', { required: true })

const schema = z.object({
  maxWeeklyHours: z
    .string()
    .min(1, 'Max weekly hours is required')
    .regex(/^\d+$/, 'Must be a number'),
  maximumOvertimeHoursPerWeek: z
    .string()
    .min(1, 'Max overtime hours is required')
    .regex(/^\d+$/, 'Must be a number'),
  enableOvertimeRules: z.boolean()
})

type Schema = z.output<typeof schema>

// const wageData = reactive<Partial<Schema>>({
//   maxWeeklyHours: undefined,
//   email: undefined,
//   password: undefined
// })

const toast = useToast()
async function onSubmit(event: FormSubmitEvent<Schema>) {
  toast.add({ title: 'Success', description: 'The form has been submitted.', color: 'success' })
  console.log(event.data)
}
</script>
