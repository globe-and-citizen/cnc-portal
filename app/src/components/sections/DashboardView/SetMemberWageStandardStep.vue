<template>
  <UForm
    :schema="standardSchema"
    :state="wageData"
    class="space-y-4"
    data-test="standard-wage-step"
    @submit="emit('validated')"
  >
    <UFormField name="maximumHoursPerWeek">
      <UInput
        v-model="wageData.maximumHoursPerWeek"
        class="w-full"
        size="xl"
        type="number"
        placeholder="Enter max hours per week..."
        :ui="{ base: 'pl-36', leading: 'pointer-events-none' }"
      >
        <template #leading>
          <p class="text-sm text-muted">Max Weekly Hours |</p>
        </template>
      </UInput>
    </UFormField>

    <UFormField name="ratePerHour">
      <div class="space-y-4">
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
                >
                  {{ rate.type === 'native' ? NETWORK.currencySymbol : rate.type.toUpperCase() }}
                </UBadge>
              </template>
            </UInput>
          </UFormField>
        </UFieldGroup>
      </div>
    </UFormField>

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

    <UAlert
      v-if="errorMessage"
      color="error"
      variant="soft"
      icon="i-heroicons-x-circle"
      :description="errorMessage"
      data-test="error-state"
    />

    <div class="flex justify-between w-full">
      <UButton
        v-if="wage"
        color="error"
        size="lg"
        type="button"
        data-test="reset-wage-button"
        @click="emit('reset')"
      >
        Reset Wage
      </UButton>
      <div class="ml-auto flex gap-3">
        <UButton
          color="error"
          variant="outline"
          size="lg"
          type="button"
          data-test="add-wage-cancel-button"
          @click="emit('cancel')"
        >
          Cancel
        </UButton>
        <UButton
          type="submit"
          :loading="isPending"
          :disabled="isPending"
          color="success"
          size="lg"
          data-test="add-wage-button"
        >
          {{ wageData.enableOvertimeRules ? 'Next →' : 'Save' }}
        </UButton>
      </div>
    </div>
  </UForm>
</template>

<script setup lang="ts">
import * as z from 'zod'
import { NETWORK } from '@/constant'
import type { Wage, WageWithForm } from '@/types'

const emit = defineEmits<{ validated: []; cancel: []; reset: [] }>()

const wageData = defineModel<WageWithForm>('wageData', { required: true })

defineProps<{
  isPending: boolean
  wage?: Wage
  errorMessage?: string
}>()

const rateSchema = z.object({
  type: z.enum(['native', 'usdc', 'sher', 'usdc.e']),
  amount: z.coerce.number(),
  enabled: z.boolean()
})

const standardSchema = z.object({
  maximumHoursPerWeek: z.coerce
    .number()
    .int('Must be a whole number')
    .positive('Max weekly hours must be greater than 0'),
  ratePerHour: z.array(rateSchema).superRefine((rates, ctx) => {
    if (rates.filter((r) => r.enabled).length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [], message: 'Enable at least one rate' })
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
  })
})
</script>
