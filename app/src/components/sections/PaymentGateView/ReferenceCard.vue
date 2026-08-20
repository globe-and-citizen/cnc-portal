<template>
  <UCard data-test="payment-gate-reference-card">
    <template #header>
      <div class="flex items-center justify-between gap-3">
        <h3 class="text-base font-semibold">Reference</h3>
        <UBadge color="warning" variant="subtle" size="sm">Backend not built yet</UBadge>
      </div>
    </template>

    <p class="text-muted mb-4 text-sm">
      Recall a payment's status by facture ID — the fallback for when you weren't able to record it
      yourself at payment time.
    </p>

    <div class="space-y-4">
      <div>
        <label class="mb-1 block text-xs font-medium uppercase">Recall</label>
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
  "amount": "128.00",
  "token": "USDC",
  "tx": "0x4f2a…c91b"
}</code></pre>
      </div>

      <div>
        <label class="mb-1 block text-xs font-medium uppercase">Status flow</label>
        <div class="mt-2 flex items-center gap-2 text-xs">
          <UBadge color="neutral" variant="subtle" size="xs">pending</UBadge>
          <span>→</span>
          <UBadge color="neutral" variant="subtle" size="xs">paid</UBadge>
          <span>/</span>
          <UBadge color="neutral" variant="subtle" size="xs">failed</UBadge>
        </div>
      </div>

      <UAlert
        color="warning"
        variant="subtle"
        icon="i-lucide-triangle-alert"
        title="Edge case — the txHash was never registered"
        description="This lookup only works if the widget reported the txHash for this facture ID at payment time. Without it, nothing links the facture ID to a transaction."
      />
      <UAlert
        color="warning"
        variant="subtle"
        icon="i-lucide-triangle-alert"
        title="Edge case — the txHash report never reached CNC Pay"
        description="The customer closed the page, or the network dropped, between the transaction broadcasting and the report landing. Not decided yet: a contract function taking the facture ID and amount, or registering the txHash directly in the database as soon as MetaMask validates."
      />
    </div>
  </UCard>
</template>
