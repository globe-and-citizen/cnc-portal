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
          The Bank address goes on the script tag, once per page. The facture ID, amount, and
          callback are per order — set them on the mount `&lt;div&gt;` for that checkout.
        </p>
        <pre
          class="bg-elevated border-default overflow-x-auto rounded-md border p-3 text-xs"
        ><code>&lt;script src="https://pay.cncportal.io/widget.js" data-bank="{{ bankAddress }}" async&gt;&lt;/script&gt;
&lt;div
  id="cnc-pay"
  data-facture-id="order_8842"
  data-amount="128.00"
  data-token="USDC"
  data-on-status="handlePaymentStatus"
&gt;&lt;/div&gt;</code></pre>
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

const toast = useToast()
const teamStore = useTeamStore()

const bankAddress = computed(() => teamStore.getContractAddressByType('Bank') ?? '0x…')
const snippet = computed(
  () =>
    `<script src="https://pay.cncportal.io/widget.js" data-bank="${bankAddress.value}" async><\/script>\n<div\n  id="cnc-pay"\n  data-facture-id="order_8842"\n  data-amount="128.00"\n  data-token="USDC"\n  data-on-status="handlePaymentStatus"\n><\/div>`
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
