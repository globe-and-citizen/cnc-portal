<!--
  Rendered by `main.ts`'s `show()` in place of the real payment card when the
  host page's <script> tag is missing `data-bank`/`data-token` — a merchant
  integration mistake, not something a shopper caused. Kept as its own tiny
  component (rather than a branch inside `WidgetApp.vue`) because it needs
  none of `WidgetApp`'s props (`bankAddress`, `token`, …) — those are exactly
  what's missing here.
-->
<template>
  <UCard data-test="cnc-pay-widget-misconfigured">
    <template #header>
      <div class="flex items-center gap-2 font-semibold">
        <span class="bg-primary inline-block h-4 w-4 rounded"></span>
        CNC Pay
      </div>
    </template>
    <UAlert
      color="error"
      variant="soft"
      title="Payment unavailable"
      description="This checkout isn't set up correctly. Please contact the site owner."
    />
  </UCard>
</template>
