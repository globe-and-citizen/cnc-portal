#!/usr/bin/env node
// Local-only static server for the Payment Gate widget: serves the built
// `dist-widget/widget.js` plus a demo host page embedding it exactly the way
// a merchant would (same snippet `IntegrationCard.vue` generates), so the
// real embed flow — script tag, mount div, shadow DOM — can be exercised in
// a browser without a merchant site. Not part of the widget build itself and
// never shipped; run `npm run build:widget` first, then this.

import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const DIST_WIDGET = fileURLToPath(new URL('../dist-widget/widget.js', import.meta.url))
const PORT = Number(process.env.PORT) || 4174

function demoHtml(url) {
  const bank = url.searchParams.get('bank') || '0x0000000000000000000000000000000000000000'
  const token = url.searchParams.get('token') || 'USDC'
  const factureId = url.searchParams.get('factureId') || 'order_demo'
  const amount = url.searchParams.get('amount') || '10.00'

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Payment Gate widget — local demo</title>
  </head>
  <body>
    <h1>Payment Gate widget — local demo</h1>
    <p>
      Override via query params, e.g.
      <code>?bank=0x...&amp;token=USDC&amp;factureId=order_1&amp;amount=25.00</code>
    </p>
    <script src="/widget.js" data-bank="${bank}" data-token="${token}" async></script>
    <div
      id="cnc-pay"
      data-facture-id="${factureId}"
      data-amount="${amount}"
      data-on-status="handlePaymentStatus"
    ></div>
    <script>
      function handlePaymentStatus(payload) {
        console.log('[demo] payment status', payload)
      }
    </script>
  </body>
</html>
`
}

if (!existsSync(DIST_WIDGET)) {
  console.error(`dist-widget/widget.js not found — run "npm run build:widget" first.`)
  process.exit(1)
}

createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`)

  if (url.pathname === '/widget.js') {
    res.writeHead(200, { 'Content-Type': 'application/javascript' })
    res.end(await readFile(DIST_WIDGET))
    return
  }

  res.writeHead(200, { 'Content-Type': 'text/html' })
  res.end(demoHtml(url))
}).listen(PORT, () => {
  console.log(`Payment Gate widget demo running at http://localhost:${PORT}`)
})
