/**
 * Builds the copy-paste embed snippets shown on the Payment Gate Setup page.
 * Every format wires the same thing: the widget `<script>` carrying
 * `data-bank`/`data-token` (read once by `src/widget/main.ts` via
 * `document.currentScript`, which also holds for a dynamically appended
 * classic script), a `#cnc-pay` mount point, and a checkout handler calling
 * the `window.CncPay` API with the order's facture ID and amount.
 */

/** Tokens the widget can take payment in — see `TokenConfigCard.vue` for why POL isn't one. */
export type PaymentGateToken = 'USDC' | 'USDCe'

export type PaymentGateSnippetLanguage = 'html' | 'vue' | 'react'

export const PAYMENT_GATE_SNIPPET_LANGUAGES: ReadonlyArray<{
  value: PaymentGateSnippetLanguage
  label: string
}> = [
  { value: 'html', label: 'HTML / JavaScript' },
  { value: 'vue', label: 'Vue 3' },
  { value: 'react', label: 'React' }
]

export interface PaymentGateSnippetParams {
  language: PaymentGateSnippetLanguage
  widgetScriptUrl: string
  bankAddress: string
  token: PaymentGateToken
}

type SnippetConfig = Omit<PaymentGateSnippetParams, 'language'>

function buildHtmlSnippet({ widgetScriptUrl, bankAddress, token }: SnippetConfig): string {
  return `<script src="${widgetScriptUrl}" data-bank="${bankAddress}" data-token="${token}" async></script>
<div id="cnc-pay"></div>
<button id="checkout-button">Pay 128.00 ${token}</button>

<script>
  document.getElementById('checkout-button').addEventListener('click', () => {
    CncPay.setFactureId('order_8842') // this order's ID in your system
    CncPay.setAmount('128.00')        // this order's amount
    CncPay.setOnStatus((status) => console.log('payment status', status))
    CncPay.show('#cnc-pay')
  })
</script>`
}

// Shared by the Vue and React samples: the merchant's TypeScript project has
// no `window.CncPay` declaration, so each sample carries a minimal local type,
// and loads the widget script once per page even if the component remounts.
function buildComponentHelpers({ widgetScriptUrl, bankAddress, token }: SnippetConfig): string {
  return `type CncPayApi = {
  setFactureId(factureId: string): void
  setAmount(amount: string): void
  setOnStatus(callback: (status: string) => void): void
  show(target: string | HTMLElement): void
}
const cncPay = () => (window as unknown as { CncPay: CncPayApi }).CncPay

function loadWidgetScript(): HTMLScriptElement {
  const existing = document.getElementById('cnc-pay-widget')
  if (existing instanceof HTMLScriptElement) return existing
  const script = document.createElement('script')
  script.id = 'cnc-pay-widget'
  script.src = '${widgetScriptUrl}'
  script.setAttribute('data-bank', '${bankAddress}')
  script.setAttribute('data-token', '${token}')
  script.async = true
  document.body.appendChild(script)
  return script
}`
}

function buildVueSnippet(config: SnippetConfig): string {
  return `<template>
  <div id="cnc-pay"></div>
  <button :disabled="!widgetReady" @click="checkout">Pay 128.00 ${config.token}</button>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'

${buildComponentHelpers(config)}

const widgetReady = ref(false)
const onWidgetLoad = () => {
  widgetReady.value = true
}
let widgetScript: HTMLScriptElement | undefined

onMounted(() => {
  if ('CncPay' in window) return onWidgetLoad()
  widgetScript = loadWidgetScript()
  widgetScript.addEventListener('load', onWidgetLoad)
})
onUnmounted(() => widgetScript?.removeEventListener('load', onWidgetLoad))

function checkout() {
  cncPay().setFactureId('order_8842') // this order's ID in your system
  cncPay().setAmount('128.00')        // this order's amount
  cncPay().setOnStatus((status) => console.log('payment status', status))
  cncPay().show('#cnc-pay')
}
</script>`
}

function buildReactSnippet(config: SnippetConfig): string {
  return `import { useEffect, useState } from 'react'

${buildComponentHelpers(config)}

export function CncPayCheckout() {
  const [widgetReady, setWidgetReady] = useState(false)

  useEffect(() => {
    if ('CncPay' in window) return setWidgetReady(true)
    const script = loadWidgetScript()
    const onLoad = () => setWidgetReady(true)
    script.addEventListener('load', onLoad)
    return () => script.removeEventListener('load', onLoad)
  }, [])

  function checkout() {
    cncPay().setFactureId('order_8842') // this order's ID in your system
    cncPay().setAmount('128.00')        // this order's amount
    cncPay().setOnStatus((status) => console.log('payment status', status))
    cncPay().show('#cnc-pay')
  }

  return (
    <>
      <div id="cnc-pay"></div>
      <button disabled={!widgetReady} onClick={checkout}>
        Pay 128.00 ${config.token}
      </button>
    </>
  )
}`
}

const SNIPPET_BUILDERS: Record<PaymentGateSnippetLanguage, (config: SnippetConfig) => string> = {
  html: buildHtmlSnippet,
  vue: buildVueSnippet,
  react: buildReactSnippet
}

export function buildPaymentGateSnippet({ language, ...config }: PaymentGateSnippetParams): string {
  return SNIPPET_BUILDERS[language](config)
}
