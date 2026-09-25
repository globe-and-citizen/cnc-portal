<template>
  <UCard data-test="payment-gate-integration-card">
    <template #header>
      <div class="flex items-center justify-between gap-3">
        <h3 class="text-base font-semibold">Integration</h3>
        <UBadge color="success" variant="subtle" size="sm">Live on Polygon</UBadge>
      </div>
    </template>

    <UAlert
      v-if="!bankAddress"
      color="warning"
      variant="soft"
      icon="i-lucide-triangle-alert"
      title="No Bank contract found"
      description="This team doesn't have a Bank contract yet, so Payment Gate can't be set up. It's deployed automatically when a team is created — if this doesn't resolve, contact support."
      data-test="payment-gate-no-bank-alert"
    />

    <UAlert
      v-else-if="!WIDGET_SCRIPT_URL"
      color="warning"
      variant="soft"
      icon="i-lucide-triangle-alert"
      title="Payment Gate isn't available on this deployment"
      description="The widget script URL isn't configured here, so any embed snippet generated would never actually load. Contact support."
      data-test="payment-gate-no-widget-url-alert"
    />

    <template v-else>
      <p class="text-muted mb-4 text-sm">
        Drop this on any page you own. It mounts CNC Pay and routes every payment straight to this
        team's Bank — the address below, used as-is, no separate key to manage.
      </p>

      <div class="space-y-3">
        <div>
          <label class="text-muted mb-1 block text-xs font-medium uppercase">Bank address</label>
          <div class="flex gap-2">
            <UInput
              :model-value="bankAddress"
              readonly
              class="w-full font-mono"
              :ui="{ base: 'font-mono text-xs' }"
            />
            <UButton
              color="neutral"
              variant="outline"
              icon="i-lucide-copy"
              :label="copiedAddress ? 'Copied' : 'Copy'"
              @click="copy(bankAddress, 'address')"
            />
          </div>
        </div>

        <div>
          <label class="text-muted mb-1 block text-xs font-medium uppercase">Embed snippet</label>
          <p class="text-muted mb-2 text-xs">
            The script tag and the mount <code>&lt;div&gt;</code> go on the page once. Whatever
            triggers checkout for an order — a Buy button, here — is where you call
            <code>CncPay.setFactureId</code>/<code>setAmount</code> then <code>show()</code> with
            that order's real ID and amount. Nothing to store, nothing to recreate per order.
          </p>
          <UFieldGroup size="sm" class="mb-2" data-test="payment-gate-snippet-languages">
            <UButton
              v-for="option in PAYMENT_GATE_SNIPPET_LANGUAGES"
              :key="option.value"
              :color="selectedLanguage === option.value ? 'primary' : 'neutral'"
              :variant="selectedLanguage === option.value ? 'solid' : 'outline'"
              :label="option.label"
              @click="selectedLanguage = option.value"
            />
          </UFieldGroup>
          <pre
            class="bg-elevated border-default overflow-x-auto rounded-md border p-3 text-xs"
            data-test="payment-gate-snippet"
          ><code>{{ snippet }}</code></pre>
          <div class="mt-2 flex justify-end">
            <UButton
              color="neutral"
              variant="outline"
              size="sm"
              icon="i-lucide-copy"
              :label="copiedSnippet ? 'Copied' : 'Copy snippet'"
              @click="copy(snippet, 'snippet')"
            />
          </div>
        </div>
      </div>
    </template>
  </UCard>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useTeamStore } from '@/stores'
import { WIDGET_SCRIPT_URL } from '@/constant'
import {
  PAYMENT_GATE_SNIPPET_LANGUAGES,
  buildPaymentGateSnippet,
  type PaymentGateSnippetLanguage,
  type PaymentGateToken
} from '@/utils/paymentGate/widgetSnippet'

const { selectedToken } = defineProps<{ selectedToken: PaymentGateToken }>()

const toast = useToast()
const teamStore = useTeamStore()

const bankAddress = computed(() => teamStore.getContractAddressByType('Bank'))
const selectedLanguage = ref<PaymentGateSnippetLanguage>('html')
const snippet = computed(() =>
  buildPaymentGateSnippet({
    language: selectedLanguage.value,
    widgetScriptUrl: WIDGET_SCRIPT_URL,
    bankAddress: bankAddress.value ?? '',
    token: selectedToken
  })
)

const copiedAddress = ref(false)
const copiedSnippet = ref(false)

async function copy(text: string, which: 'address' | 'snippet') {
  await navigator.clipboard.writeText(text)
  if (which === 'address') {
    copiedAddress.value = true
    setTimeout(() => (copiedAddress.value = false), 1200)
  } else {
    copiedSnippet.value = true
    setTimeout(() => (copiedSnippet.value = false), 1200)
  }
  toast.add({ title: 'Copied to clipboard', color: 'success' })
}
</script>
