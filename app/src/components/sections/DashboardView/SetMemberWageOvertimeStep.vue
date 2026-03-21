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
          <span class="font-semibold">{{ wageData.maximumHoursPerWeek }} hrs/wk</span> will be paid
          at the rates below, instead of the standard rates.
        </p>
      </template>
    </UAlert>

    <UForm :schema="schema" :state="wageData" class="space-y-4">
      <UFormField name="maximumOvertimeHoursPerWeek">
        <UInput
          v-model="wageData.maximumOvertimeHoursPerWeek"
          class="w-full"
          size="xl"
          type="number"
          placeholder="Enter overtime hours per week..."
          :ui="{
            base: 'pl-36',
            leading: 'pointer-events-none'
          }"
        >
          <template #leading> <p class="text-sm text-muted">Overtime Hours |</p> </template>
        </UInput>
      </UFormField>

      <h3 class="text-lg font-semibold mb-4">Overtime Hourly Rates</h3>

      <UFieldGroup
        v-for="rate in wageData.overtimeRatePerHour"
        :key="rate.type"
        class="flex items-center gap-4"
      >
        <USwitch size="xl" v-model="rate.enabled" />
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
              >{{
                rate.type === 'native' ? NETWORK.currencySymbol : rate.type.toUpperCase()
              }}</UBadge
            >
          </template>
        </UInput>
      </UFieldGroup>
    </UForm>

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
            v-for="item in standardRateSummary"
            :key="item"
            class="text-lg font-semibold text-base-content/80"
          >
            {{ item }}
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
            v-for="item in overtimeRateSummary"
            :key="item"
            class="text-lg font-semibold text-emerald-700"
          >
            {{ item }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import * as z from 'zod'
import { NETWORK } from '@/constant'
import type { WageWithForm } from './SetMemberWageModalCopy.vue'

const wageData = defineModel<WageWithForm>('wageData', { required: true })

const schema = z.object({
  maximumOvertimeHoursPerWeek: z.coerce
    .number()
    .int('Must be a whole number')
    .positive('Overtime hours must be greater than 0')
    .nullable(),
  overtimeRatePerHour: z
    .array(
      z.object({
        type: z.enum(['native', 'usdc', 'sher', 'usdc.e']),
        amount: z.coerce.number().min(0, 'Must be non-negative')
      })
    )
    .refine(
      (rates) => {
        const native = rates.find((r) => r.type === 'native')
        return native ? native.amount > 0 : true
      },
      { message: 'Native rate must be greater than 0', path: ['0', 'amount'] }
    )
})

const formatRate = (type: string, amount: number) => {
  const label = type === 'native' ? NETWORK.currencySymbol : type.toUpperCase()
  return `${amount} ${label}/hr`
}

const standardRateSummary = computed(() =>
  wageData.value.ratePerHour
    .filter((r) => r.enabled && r.amount > 0)
    .map((r) => formatRate(r.type, r.amount))
)

const overtimeRateSummary = computed(() =>
  wageData.value.overtimeRatePerHour
    .filter((r) => r.enabled && r.amount > 0)
    .map((r) => formatRate(r.type, r.amount))
)
</script>
