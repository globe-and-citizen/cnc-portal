<template>
  <UForm
    :schema="overtimeSchema"
    :state="wageData"
    class="space-y-4"
    data-test="overtime-rules-step"
    @submit="emit('validated')"
  >
    <UAlert
      color="success"
      variant="soft"
      class="rounded-2xl border border-emerald-300"
      data-test="overtime-banner"
    >
      <template #description>
        <p class="mt-2 text-emerald-900">
          Hours beyond
          <span class="font-semibold">{{ wageData.maximumHoursPerWeek }} hrs/wk</span> will be paid
          at the rates below, instead of the standard rates.
        </p>
      </template>
    </UAlert>

    <UFormField name="maximumOvertimeHoursPerWeek">
      <UInput
        v-model="wageData.maximumOvertimeHoursPerWeek"
        class="w-full"
        size="xl"
        type="number"
        placeholder="e.g. 10"
        :ui="{ base: 'pl-36', leading: 'pointer-events-none' }"
      >
        <template #leading>
          <p class="text-sm text-muted">Overtime cap (hrs)</p>
        </template>
      </UInput>
    </UFormField>

    <UFormField name="overtimeRatePerHour">
      <div class="space-y-4">
        <h3 class="text-lg font-semibold mb-4">Overtime Hourly Rates</h3>
        <UFieldGroup
          v-for="(rate, index) in wageData.overtimeRatePerHour"
          :key="rate.type"
          class="flex items-center gap-4"
        >
          <USwitch size="xl" v-model="rate.enabled" />
          <UFormField :name="`overtimeRatePerHour.${index}.amount`" class="w-full">
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
                  class="text-sm rounded-full px-4 w-16 flex justify-center"
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

    <div class="grid gap-4 md:grid-cols-2">
      <div
        class="min-h-40 rounded-2xl border border-base-300 bg-base-100 px-5 py-5"
        data-test="standard-rate-recap"
      >
        <p class="text-sm font-semibold uppercase tracking-[0.2em] text-base-content/50">
          Standard rates
        </p>
        <RateDotList
          class="mt-3"
          :rates="wageData.ratePerHour.filter((r) => r.enabled && r.amount > 0)"
          text-class="text-base-content/80"
        />
      </div>
      <div
        class="min-h-40 rounded-2xl border border-emerald-300 bg-emerald-50/60 px-5 py-5"
        data-test="overtime-rate-recap"
      >
        <p class="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">
          Overtime rates
        </p>
        <RateDotList
          class="mt-3"
          :rates="wageData.overtimeRatePerHour.filter((r) => r.enabled && r.amount > 0)"
          text-class="text-emerald-700"
        />
      </div>
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
      <div class="ml-auto flex gap-3">
        <UButton
          variant="outline"
          size="lg"
          type="button"
          icon="i-heroicons-arrow-left"
          data-test="back-wage-button"
          @click="emit('back')"
        >
          Back
        </UButton>
        <UButton
          type="submit"
          :loading="isPending"
          :disabled="isPending"
          color="success"
          size="lg"
          data-test="save-overtime-wage-button"
        >
          Save wage
        </UButton>
      </div>
    </div>
  </UForm>
</template>

<script setup lang="ts">
import * as z from 'zod'
import { NETWORK } from '@/constant'
import type { WageWithForm } from '@/types'
import RateDotList from '@/components/RateDotList.vue'

const emit = defineEmits<{ validated: []; back: [] }>()

const wageData = defineModel<WageWithForm>('wageData', { required: true })

defineProps<{
  isPending: boolean
  errorMessage?: string
}>()

const rateSchema = z.object({
  type: z.enum(['native', 'usdc', 'sher', 'usdc.e']),
  amount: z.coerce.number(),
  enabled: z.boolean()
})

const overtimeSchema = z.object({
  maximumOvertimeHoursPerWeek: z.coerce
    .number()
    .int('Must be a whole number')
    .positive('Overtime hours must be greater than 0'),
  overtimeRatePerHour: z.array(rateSchema).superRefine((rates, ctx) => {
    if (rates.filter((r) => r.enabled).length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [],
        message: 'Enable at least one overtime rate'
      })
    }
    for (const [index, rate] of rates.entries()) {
      if (rate.enabled && rate.amount <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [index, 'amount'],
          message: 'Enabled overtime rates must be greater than 0'
        })
      }
    }
  })
})
</script>
