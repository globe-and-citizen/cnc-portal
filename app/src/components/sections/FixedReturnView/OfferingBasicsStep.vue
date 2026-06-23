<template>
  <UForm ref="formRef" :schema="schema" :state="form" class="flex flex-col gap-3">
    <UFormField label="Offering title" name="title">
      <UInput
        v-model="form.title"
        placeholder="e.g. Riverside Expansion Note"
        class="w-full"
        data-test="offering-title-input"
      />
    </UFormField>
    <UFormField label="Purpose" name="purpose">
      <UTextarea
        v-model="form.purpose"
        placeholder="What is this credit for? Lenders see this before lending."
        class="w-full"
        data-test="offering-purpose-input"
      />
    </UFormField>
    <div class="grid grid-cols-2 gap-3">
      <UFormField label="Target amount" name="principal">
        <UFieldGroup>
          <UInput
            type="number"
            :model-value="form.principal"
            class="w-full"
            data-test="offering-principal-input"
            @update:model-value="(v) => (form.principal = Number(v))"
          />
          <USelect
            v-model="form.token"
            :items="tokenOptions"
            size="xs"
            class="h-8 w-24"
            data-test="amount-token-select"
          />
        </UFieldGroup>
      </UFormField>
      <UFormField label="Interest rate (fixed, over the term)" name="rate">
        <UInput
          type="number"
          step="0.1"
          :model-value="form.rate"
          class="w-full"
          data-test="offering-rate-input"
          @update:model-value="(v) => (form.rate = Number(v))"
        >
          <template #trailing><span class="text-muted text-sm font-semibold">%</span></template>
        </UInput>
      </UFormField>
    </div>
  </UForm>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { z } from 'zod'
import { SUPPORTED_TOKENS } from '@/constant'
import type { OfferingForm } from './offeringForm'

const form = defineModel<OfferingForm>('form', { required: true })

const tokenOptions = SUPPORTED_TOKENS.map((t) => ({ label: t.symbol, value: t.symbol }))

const schema = computed(() =>
  z.object({
    title: z.string().min(3, 'Title must be at least 3 characters'),
    principal: z
      .number({ error: 'Target amount is required' })
      .positive('Target amount must be greater than 0'),
    rate: z
      .number({ error: 'Interest rate is required' })
      .positive('Rate must be greater than 0')
      .max(100, 'Rate must be 100% or less')
  })
)

const formRef = ref<{ validate: () => Promise<unknown> } | null>(null)
defineExpose({ validate: () => formRef.value!.validate() })
</script>
