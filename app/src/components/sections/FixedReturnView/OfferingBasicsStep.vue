<template>
  <UForm ref="formRef" :schema="schema" :state="form" class="flex flex-col gap-3">
    <UFormField label="Offering title" name="title">
      <UInput
        :model-value="form.title"
        placeholder="e.g. Riverside Expansion Note"
        class="w-full"
        data-test="offering-title-input"
        @update:model-value="(value: unknown) => updateTextField('title', value)"
      />
    </UFormField>
    <UFormField label="Purpose" name="purpose">
      <UTextarea
        :model-value="form.purpose"
        placeholder="What is this credit for? Lenders see this before lending."
        class="w-full"
        data-test="offering-purpose-input"
        @update:model-value="(value: unknown) => updateTextField('purpose', value)"
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
            @update:model-value="(v: unknown) => (form.principal = Number(v))"
          />
          <USelect
            :model-value="form.token"
            :items="tokenOptions"
            size="xs"
            class="h-8 w-24"
            data-test="amount-token-select"
            @update:model-value="updateToken"
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
          @update:model-value="(v: unknown) => (form.rate = Number(v))"
        >
          <template #trailing><span class="text-muted text-sm font-semibold">%</span></template>
        </UInput>
      </UFormField>
    </div>
  </UForm>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { Address } from 'viem'
import { useFixedReturnGetSupportedTokens } from '@/composables/fixedReturn/reads'
import { offeringBasicsSchema, type OfferingForm } from '@/types'
import { getSupportedOfferingTokenOptions } from '@/utils'

const form = defineModel<OfferingForm>('form', { required: true })

const { data: supportedTokenAddresses } = useFixedReturnGetSupportedTokens()

// Driven by the contract's own getSupportedTokens() rather than a hardcoded list —
// which tokens an offer can use depends on what this team's owner has actually
// registered via addTokenSupport (set at deploy time, see contractDeploymentUtil.ts).
const tokenOptions = computed(() => {
  const addresses = supportedTokenAddresses.value as Address[] | undefined
  if (!addresses) return []
  return getSupportedOfferingTokenOptions(addresses)
})

// Fall back to the first actually-supported token if the form's current selection
// (e.g. a stale default) isn't one of them.
watch(
  tokenOptions,
  (options) => {
    const firstOption = options[0]
    if (firstOption && !options.some((o) => o.value === form.value.token)) {
      form.value.token = firstOption.value
    }
  },
  { immediate: true }
)

const schema = offeringBasicsSchema

const formRef = ref<{ validate: () => Promise<unknown> } | null>(null)
defineExpose({ validate: () => formRef.value!.validate() })

function updateTextField(field: 'title' | 'purpose', value: unknown) {
  form.value[field] = String(value ?? '')
}

function updateToken(value: unknown) {
  form.value.token = typeof value === 'string' ? value : undefined
}
</script>
