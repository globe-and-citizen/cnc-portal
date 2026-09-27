/**
 * Builds the copy-paste embed snippets shown on the Payment Gate Setup page.
 * Every format wires the same thing: the widget `<script>` carrying
 * `data-bank`/`data-token` (read once by `src/widget/main.ts` via
 * `document.currentScript`, which also holds for a dynamically appended
 * classic script), a `#cnc-pay` mount point, and a checkout handler calling
 * the `window.CncPay` API with the order's facture ID and amount.
 *
 * Each format is split into the two steps a merchant follows: `setup` (add the
 * script tag, or create a component file) and `usage` (start a payment with
 * the order's `factureId` and `amount`).
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

export interface PaymentGateSnippetPart {
  title: string
  /** File the merchant saves this part as, when it's a file of its own. */
  filename?: string
  code: string
}

export interface PaymentGateSnippet {
  setup: PaymentGateSnippetPart
  usage: PaymentGateSnippetPart
}

type SnippetConfig = Omit<PaymentGateSnippetParams, 'language'>

function buildHtmlSnippet({
  widgetScriptUrl,
  bankAddress,
  token
}: SnippetConfig): PaymentGateSnippet {
  return {
    setup: {
      title: 'Add the widget to your page',
      code: `<script src="${widgetScriptUrl}" data-bank="${bankAddress}" data-token="${token}" async></script>
<div id="cnc-pay"></div>`
    },
    usage: {
      title: 'Start a payment',
      code: `<button onclick="payWithCncPay('order_8842', '128.00')">Pay 128.00 ${token}</button>

<script>
  // factureId: this order's ID in your system · amount: this order's amount
  function payWithCncPay(factureId, amount) {
    CncPay.setFactureId(factureId)
    CncPay.setAmount(amount)
    CncPay.setOnStatus((status) => console.log('payment status', status))
    CncPay.show('#cnc-pay')
  }
</script>`
    }
  }
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

function buildVueSnippet(config: SnippetConfig): PaymentGateSnippet {
  return {
    setup: {
      title: 'Create the component',
      filename: 'CncPayCheckout.vue',
      code: `<template>
  <div id="cnc-pay"></div>
  <button :disabled="!widgetReady" @click="checkout">Pay {{ amount }} ${config.token}</button>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'

const props = defineProps<{
  factureId: string // this order's ID in your system
  amount: string // this order's amount, e.g. '128.00'
}>()

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
  cncPay().setFactureId(props.factureId)
  cncPay().setAmount(props.amount)
  cncPay().setOnStatus((status) => console.log('payment status', status))
  cncPay().show('#cnc-pay')
}
</script>`
    },
    usage: {
      title: 'Use it in your checkout',
      code: `<script setup lang="ts">
import CncPayCheckout from './CncPayCheckout.vue'

const factureId = 'order_8842' // this order's ID in your system
const amount = '128.00' // this order's amount
</script>

<template>
  <CncPayCheckout :facture-id="factureId" :amount="amount" />
</template>`
    }
  }
}

function buildReactSnippet(config: SnippetConfig): PaymentGateSnippet {
  return {
    setup: {
      title: 'Create the component',
      filename: 'CncPayCheckout.tsx',
      code: `import { useEffect, useState } from 'react'

${buildComponentHelpers(config)}

type CncPayCheckoutProps = {
  factureId: string // this order's ID in your system
  amount: string // this order's amount, e.g. '128.00'
}

export function CncPayCheckout({ factureId, amount }: CncPayCheckoutProps) {
  const [widgetReady, setWidgetReady] = useState(false)

  useEffect(() => {
    if ('CncPay' in window) return setWidgetReady(true)
    const script = loadWidgetScript()
    const onLoad = () => setWidgetReady(true)
    script.addEventListener('load', onLoad)
    return () => script.removeEventListener('load', onLoad)
  }, [])

  function checkout() {
    cncPay().setFactureId(factureId)
    cncPay().setAmount(amount)
    cncPay().setOnStatus((status) => console.log('payment status', status))
    cncPay().show('#cnc-pay')
  }

  return (
    <>
      <div id="cnc-pay"></div>
      <button disabled={!widgetReady} onClick={checkout}>
        Pay {amount} ${config.token}
      </button>
    </>
  )
}`
    },
    usage: {
      title: 'Use it in your checkout',
      code: `import { CncPayCheckout } from './CncPayCheckout'

const factureId = 'order_8842' // this order's ID in your system
const amount = '128.00' // this order's amount

export function CheckoutPage() {
  return <CncPayCheckout factureId={factureId} amount={amount} />
}`
    }
  }
}

const SNIPPET_BUILDERS: Record<
  PaymentGateSnippetLanguage,
  (config: SnippetConfig) => PaymentGateSnippet
> = {
  html: buildHtmlSnippet,
  vue: buildVueSnippet,
  react: buildReactSnippet
}

export function buildPaymentGateSnippet({
  language,
  ...config
}: PaymentGateSnippetParams): PaymentGateSnippet {
  return SNIPPET_BUILDERS[language](config)
}
