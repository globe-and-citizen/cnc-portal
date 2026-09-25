import { describe, expect, it } from 'vitest'
import { buildPaymentGateSnippet } from '../widgetSnippet'

const config = {
  widgetScriptUrl: 'https://widget.example/widget.js',
  bankAddress: '0x000000000000000000000000000000000000bA4c',
  token: 'USDCe'
} as const

describe('buildPaymentGateSnippet', () => {
  it('builds the HTML snippet with the script tag, mount point, and checkout wiring', () => {
    const snippet = buildPaymentGateSnippet({ language: 'html', ...config })

    expect(snippet).toContain(
      `<script src="${config.widgetScriptUrl}" data-bank="${config.bankAddress}" data-token="USDCe" async></script>`
    )
    expect(snippet).toContain('<div id="cnc-pay"></div>')
    expect(snippet).toContain("CncPay.show('#cnc-pay')")
  })

  it('builds a Vue 3 component that loads the widget with the Bank address and token', () => {
    const snippet = buildPaymentGateSnippet({ language: 'vue', ...config })

    expect(snippet).toContain('<script setup lang="ts">')
    expect(snippet).toContain('onMounted(')
    expect(snippet).toContain(`script.src = '${config.widgetScriptUrl}'`)
    expect(snippet).toContain(`script.setAttribute('data-bank', '${config.bankAddress}')`)
    expect(snippet).toContain("script.setAttribute('data-token', 'USDCe')")
    expect(snippet).toContain("cncPay().setFactureId('order_8842')")
    expect(snippet).toContain("cncPay().setAmount('128.00')")
    expect(snippet).toContain("cncPay().show('#cnc-pay')")
  })

  it('builds a React component that loads the widget once in useEffect', () => {
    const snippet = buildPaymentGateSnippet({ language: 'react', ...config })

    expect(snippet).toContain("import { useEffect, useState } from 'react'")
    expect(snippet).toContain('useEffect(')
    expect(snippet).toContain("document.getElementById('cnc-pay-widget')")
    expect(snippet).toContain(`script.setAttribute('data-bank', '${config.bankAddress}')`)
    expect(snippet).toContain("script.setAttribute('data-token', 'USDCe')")
    expect(snippet).toContain("cncPay().show('#cnc-pay')")
  })
})
