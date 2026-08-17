<template>
  <UCard data-test="payment-gate-reference-card">
    <template #header>
      <div class="flex items-center justify-between gap-3">
        <h3 class="text-base font-semibold">Reference</h3>
        <UBadge color="warning" variant="subtle" size="sm">Backend not built yet</UBadge>
      </div>
    </template>

    <p class="text-muted mb-4 text-sm">
      In the happy case the widget informs this page's own callback directly — nothing to call here.
      This endpoint is the fallback: for when that direct callback didn't land.
    </p>

    <div class="space-y-4">
      <div>
        <label class="mb-1 block text-xs font-medium uppercase">Recheck</label>
        <UInput
          model-value="GET https://pay.cncportal.io/v1/payments/{facture-id}?bank={bankAddress}"
          readonly
          class="w-full font-mono text-xs"
        />
        <p class="text-muted mt-2 text-xs">
          Response — status reflects reality, one way or another
        </p>
        <pre
          class="bg-elevated border-default overflow-x-auto rounded-md border p-3 text-xs"
        ><code>{
  "factureId": "order_8842",
  "status": "paid",
  "amount": "128.77",
  "token": "USDC",
  "mode": "instant",
  "tx": "0x4f2a…c91b"
}</code></pre>
      </div>

      <div>
        <label class="mb-1 block text-xs font-medium uppercase">Status flow</label>
        <div class="mt-2 space-y-2 text-xs">
          <div class="flex items-center gap-2">
            <span class="text-muted w-40 shrink-0">Pay now</span>
            <UBadge color="neutral" variant="subtle" size="xs">pending</UBadge>
            <span>→</span>
            <UBadge color="neutral" variant="subtle" size="xs">paid</UBadge>
          </div>
          <div v-if="escrowEnabled" class="flex items-center gap-2">
            <span class="text-muted w-40 shrink-0">Hold until delivery</span>
            <UBadge color="neutral" variant="subtle" size="xs">pending</UBadge>
            <span>→</span>
            <UBadge color="neutral" variant="subtle" size="xs">held</UBadge>
            <span>→</span>
            <UBadge color="neutral" variant="subtle" size="xs">released</UBadge>
          </div>
          <div v-if="meteredEnabled" class="flex items-center gap-2">
            <span class="text-muted w-40 shrink-0">Pay as you go</span>
            <UBadge color="neutral" variant="subtle" size="xs">funding</UBadge>
            <span>→</span>
            <UBadge color="neutral" variant="subtle" size="xs">active</UBadge>
            <span>→</span>
            <UBadge color="neutral" variant="subtle" size="xs">depleted</UBadge>
            <span>/</span>
            <UBadge color="neutral" variant="subtle" size="xs">refilled</UBadge>
          </div>
        </div>
      </div>

      <UAlert
        color="warning"
        variant="subtle"
        icon="i-lucide-triangle-alert"
        title="Edge case — the direct callback didn't land"
        description="The backend checks its own record for this facture ID first. If it isn't there, the only way to find the transaction is the txHash the widget optionally reported at payment time — without it, neither the database nor the blockchain can locate anything yet."
      />
      <UAlert
        color="warning"
        variant="subtle"
        icon="i-lucide-triangle-alert"
        title="Edge case — the database loses the facture ID ↔ txHash link"
        description="That link only exists in our database today — not recoverable from the chain alone. A dedicated Bank.sol function or an intermediary contract emitting the facture ID on-chain would fix this. Not decided yet."
      />
    </div>
  </UCard>
</template>

<script setup lang="ts">
defineProps<{
  escrowEnabled: boolean
  meteredEnabled: boolean
}>()
</script>
