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

    <UForm ref="formRef" :schema="schema" :state="wageData" class="space-y-4">
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
          <template #leading>
            <p class="text-sm text-muted">Overtime Hours |</p>
          </template>
        </UInput>
      </UFormField>

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
            v-for="rate in wageData.ratePerHour.filter((r) => r.enabled && r.amount > 0)"
            :key="rate.type"
            class="text-lg font-semibold text-base-content/80"
          >
            {{ formatRate(rate.type, rate.amount) }}
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
            v-for="rate in wageData.overtimeRatePerHour.filter((r) => r.enabled && r.amount > 0)"
            :key="rate.type"
            class="text-lg font-semibold text-emerald-700"
          >
            {{ formatRate(rate.type, rate.amount) }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import * as z from 'zod'
import { ref } from 'vue'
import { NETWORK } from '@/constant'
import type { WageWithForm } from '@/types/cash-remuneration'

const wageData = defineModel<WageWithForm>('wageData', { required: true })

const schema = z.object({
  maximumOvertimeHoursPerWeek: z.coerce
    .number()
    .int('Must be a whole number')
    .positive('Overtime hours must be greater than 0'),

  overtimeRatePerHour: z
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

      const nativeRateIndex = rates.findIndex((rate) => rate.type === 'native')
      const enabledNativeRate = rates[nativeRateIndex]

      if (!enabledNativeRate || !enabledNativeRate.enabled || enabledNativeRate.amount <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [nativeRateIndex >= 0 ? nativeRateIndex : 0, 'amount'],
          message: 'Native overtime rate must be enabled and greater than 0'
        })
      }
    })
})

const formatRate = (type: string, amount: number) => {
  const label = type === 'native' ? NETWORK.currencySymbol : type.toUpperCase()
  return `${amount} ${label}/hr`
}

const formRef = ref<{ validate: () => Promise<void> } | null>(null)

const validateForm = async (): Promise<boolean> => {
  try {
    await formRef.value?.validate()
    return true
  } catch {
    return false
  }
}

defineExpose({ validateForm })
</script>
