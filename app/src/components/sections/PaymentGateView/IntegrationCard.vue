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
          <pre
            class="bg-elevated border-default overflow-x-auto rounded-md border p-3 text-xs"
          ><code>&lt;script src="{{ WIDGET_SCRIPT_URL }}" data-bank="{{ bankAddress }}" data-token="{{ selectedToken }}" async&gt;&lt;/script&gt;
&lt;div id="cnc-pay"&gt;&lt;/div&gt;
&lt;button id="checkout-button"&gt;Pay 128.00 {{ selectedToken }}&lt;/button&gt;

&lt;script&gt;
  document.getElementById('checkout-button').addEventListener('click', () => {
    CncPay.setFactureId('order_8842') // this order's ID in your system
    CncPay.setAmount('128.00')        // this order's amount
    CncPay.setOnStatus((status) => console.log('payment status', status))
    CncPay.show('#cnc-pay')
  })
&lt;/script&gt;</code></pre>
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

const { selectedToken } = defineProps<{ selectedToken: 'USDC' | 'USDCe' | 'POL' }>()

const toast = useToast()
const teamStore = useTeamStore()

const bankAddress = computed(() => teamStore.getContractAddressByType('Bank'))
const snippet = computed(
  () =>
    `<script src="${WIDGET_SCRIPT_URL}" data-bank="${bankAddress.value}" data-token="${selectedToken}" async><\/script>\n<div id="cnc-pay"><\/div>\n<button id="checkout-button">Pay 128.00 ${selectedToken}</button>\n\n<script>\n  document.getElementById('checkout-button').addEventListener('click', () => {\n    CncPay.setFactureId('order_8842') // this order's ID in your system\n    CncPay.setAmount('128.00')        // this order's amount\n    CncPay.setOnStatus((status) => console.log('payment status', status))\n    CncPay.show('#cnc-pay')\n  })\n<\/script>`
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
