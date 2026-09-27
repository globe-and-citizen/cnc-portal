import { describe, expect, it } from 'vitest'
import { buildPaymentGateSnippet } from '../widgetSnippet'

const config = {
  widgetScriptUrl: 'https://widget.example/widget.js',
  bankAddress: '0x000000000000000000000000000000000000bA4c',
  token: 'USDCe'
} as const

describe('buildPaymentGateSnippet', () => {
  it('splits the HTML snippet into adding the widget and starting a payment', () => {
    const { setup, usage } = buildPaymentGateSnippet({ language: 'html', ...config })

    expect(setup.title).toBe('Add the widget to your page')
    expect(usage.title).toBe('Start a payment')
    expect(setup.filename).toBeUndefined()
    expect(setup.code).toBe(
      `<script src="${config.widgetScriptUrl}" data-bank="${config.bankAddress}" data-token="USDCe" async></script>
<div id="cnc-pay"></div>`
    )
    expect(usage.code).toContain("onclick=\"payWithCncPay('order_8842', '128.00')\"")
    expect(usage.code).toContain('function payWithCncPay(factureId, amount)')
    expect(usage.code).toContain('CncPay.setFactureId(factureId)')
    expect(usage.code).toContain('CncPay.setAmount(amount)')
    expect(usage.code).toContain("CncPay.show('#cnc-pay')")
  })

  it('builds a Vue 3 component file and a usage example passing factureId and amount', () => {
    const { setup, usage } = buildPaymentGateSnippet({ language: 'vue', ...config })

    expect(setup.title).toBe('Create the component')
    expect(usage.title).toBe('Use it in your checkout')
    expect(setup.filename).toBe('CncPayCheckout.vue')
    expect(setup.code).toContain('<script setup lang="ts">')
    expect(setup.code).toContain('const props = defineProps<{')
    expect(setup.code).toContain(`script.src = '${config.widgetScriptUrl}'`)
    expect(setup.code).toContain(`script.setAttribute('data-bank', '${config.bankAddress}')`)
    expect(setup.code).toContain("script.setAttribute('data-token', 'USDCe')")
    expect(setup.code).toContain('cncPay().setFactureId(props.factureId)')
    expect(setup.code).toContain('cncPay().setAmount(props.amount)')
    expect(setup.code).toContain('Pay {{ amount }} USDCe')
    expect(setup.code).not.toContain('Usage:')

    expect(usage.code).toContain("import CncPayCheckout from './CncPayCheckout.vue'")
    expect(usage.code).toContain("const factureId = 'order_8842'")
    expect(usage.code).toContain('<CncPayCheckout :facture-id="factureId" :amount="amount" />')
  })

  it('builds a React component file and a usage example passing factureId and amount', () => {
    const { setup, usage } = buildPaymentGateSnippet({ language: 'react', ...config })

    expect(setup.title).toBe('Create the component')
    expect(usage.title).toBe('Use it in your checkout')
    expect(setup.filename).toBe('CncPayCheckout.tsx')
    expect(setup.code).toContain("import { useEffect, useState } from 'react'")
    expect(setup.code).toContain("document.getElementById('cnc-pay-widget')")
    expect(setup.code).toContain(`script.setAttribute('data-bank', '${config.bankAddress}')`)
    expect(setup.code).toContain("script.setAttribute('data-token', 'USDCe')")
    expect(setup.code).toContain(
      'export function CncPayCheckout({ factureId, amount }: CncPayCheckoutProps)'
    )
    expect(setup.code).toContain('Pay {amount} USDCe')
    expect(setup.code).not.toContain('Usage:')

    expect(usage.code).toContain("import { CncPayCheckout } from './CncPayCheckout'")
    expect(usage.code).toContain("const amount = '128.00'")
    expect(usage.code).toContain('<CncPayCheckout factureId={factureId} amount={amount} />')
  })
})
