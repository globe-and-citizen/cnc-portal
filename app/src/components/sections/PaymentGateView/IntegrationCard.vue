<template>
  <UCard data-test="payment-gate-integration-card">
    <template #header>
      <div class="flex items-center justify-between gap-3">
        <h3 class="text-base font-semibold">Integration</h3>
        <UBadge color="success" variant="subtle" size="sm">Live on Polygon</UBadge>
      </div>
    </template>

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
          The Bank address goes on the script tag, once per page. For each order, call
          <code>CncPay.setFactureId</code>/<code>setAmount</code> then <code>show()</code> — nothing
          to store, nothing to recreate.
        </p>
        <pre
          class="bg-elevated border-default overflow-x-auto rounded-md border p-3 text-xs"
        ><code>&lt;script src="https://pay.cncportal.io/widget.js" data-bank="{{ bankAddress }}" data-token="{{ selectedToken }}" async&gt;&lt;/script&gt;
&lt;div id="cnc-pay"&gt;&lt;/div&gt;

&lt;script&gt;
  CncPay.setFactureId('order_8842')
  CncPay.setAmount('128.00')
  CncPay.setOnStatus((status) => console.log('payment status', status))
  CncPay.show('#cnc-pay')
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
  </UCard>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useTeamStore } from '@/stores'
import { usePaymentGateMockState } from '@/composables/usePaymentGateMockState'

const toast = useToast()
const teamStore = useTeamStore()
const { selectedToken } = usePaymentGateMockState()

const bankAddress = computed(() => teamStore.getContractAddressByType('Bank') ?? '0x…')
const snippet = computed(
  () =>
    `<script src="https://pay.cncportal.io/widget.js" data-bank="${bankAddress.value}" data-token="${selectedToken.value}" async><\/script>\n<div id="cnc-pay"><\/div>\n\n<script>\n  CncPay.setFactureId('order_8842')\n  CncPay.setAmount('128.00')\n  CncPay.setOnStatus((status) => console.log('payment status', status))\n  CncPay.show('#cnc-pay')\n<\/script>`
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
