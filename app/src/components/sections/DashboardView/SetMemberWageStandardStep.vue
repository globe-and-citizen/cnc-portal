<template>
  <div class="space-y-4" data-test="standard-wage-step">
    <UForm :schema="schema" :state="wageData" class="space-y-4">
      <UFormField name="maximumHoursPerWeek">
        <UInput
          v-model="wageData.maximumHoursPerWeek"
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

      <UFieldGroup
        v-for="(rate, index) in wageData.ratePerHour"
        :key="rate.type"
        class="flex items-center gap-4"
      >
        <USwitch size="xl" v-model="rate.enabled" />
        <UFormField :name="`ratePerHour.${index}.amount`" class="w-full">
          <UInput
            v-model="rate.amount"
            placeholder="0.00"
            size="xl"
            type="number"
            class="w-full"
            :disabled="!rate.enabled"
          >
            <template #trailing>
              <UBadge
                class="text-sm rounded-full px-4 test w-16 flex justify-center"
                :variant="rate.enabled ? 'solid' : 'outline'"
                :color="rate.enabled ? 'primary' : 'neutral'"
                >{{
                  rate.type === 'native' ? NETWORK.currencySymbol : rate.type.toUpperCase()
                }}</UBadge
              >
            </template>
          </UInput>
        </UFormField>
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
import * as z from 'zod'
import { NETWORK } from '@/constant'
import type { WageWithForm } from '@/types/cash-remuneration'

const wageData = defineModel<WageWithForm>('wageData', { required: true })

const schema = z.object({
  maximumHoursPerWeek: z.coerce
    .number()
    .int('Must be a whole number')
    .positive('Max weekly hours must be greater than 0'),
  ratePerHour: z
    .array(
      z.object({
        type: z.enum(['native', 'usdc', 'sher', 'usdc.e']),
        amount: z.coerce.number(),
        enabled: z.boolean()
      })
    )
    .superRefine((rates, ctx) => {
      const enabledRates = rates.filter((rate) => rate.enabled)

      if (enabledRates.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [],
          message: 'Enable at least one rate'
        })
      }

      for (const [index, rate] of rates.entries()) {
        if (rate.enabled && rate.amount <= 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [index, 'amount'],
            message: 'Enabled rates must be greater than 0'
          })
        }
      }

      const nativeRateIndex = rates.findIndex((rate) => rate.type === 'native')
      const enabledNativeRate = rates[nativeRateIndex]

      if (!enabledNativeRate || !enabledNativeRate.enabled || enabledNativeRate.amount <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [nativeRateIndex >= 0 ? nativeRateIndex : 0, 'amount'],
          message: 'Native rate must be enabled and greater than 0'
        })
      }
    })
})

const validateForm = () => schema.safeParse(wageData.value).success

defineExpose({ validateForm })
</script>
