/**
 * Widget entry point — bundled standalone by `vite.widget.config.ts` into
 * `widget.js`, loaded on a third-party page via
 * `<script src=".../widget.js" data-bank="0x…" data-token="USDC" async>`.
 * Bank address and token live on the `<script>` tag (one widget config per
 * page); facture ID, amount and status callback are per-checkout, read from
 * the mount element (`IntegrationCard.vue`'s embed snippet is the contract
 * for both).
 *
 * Renders `WidgetApp.vue` (real Nuxt UI components — `UCard`/`UButton`/
 * `UIcon`/`UAlert`) into a shadow root per mount point, with `widget.css`'s
 * compiled Tailwind/Nuxt UI CSS injected as an inline `<style>` so it stays
 * scoped to the widget and never leaks onto (or clashes with) the host page.
 */
import { createApp } from 'vue'
import ui from '@nuxt/ui/vue-plugin'
import type { Address } from 'viem'
import { SUPPORTED_TOKENS } from '@/constant'
// Import directly from `generalUtil`, not the `@/utils` barrel: the barrel's
// `export *` re-exports pull in every util module transitively, several of
// which import Vue/Pinia — dead weight this standalone widget bundle
// shouldn't pay for.
import { log } from '@/utils/generalUtil'
import type { WidgetPaymentStatus } from './payment'
import WidgetApp, { type WidgetToken } from './WidgetApp.vue'
// `?inline` tells Vite to return the fully compiled CSS as a plain string
// instead of injecting it into the page's <head> — we inject it ourselves,
// into the shadow root, a few lines down.
import widgetStyles from './style.css?inline'

/** Config that applies to every widget instance on the page (one <script> tag). */
interface ScriptConfig {
  bankAddress: Address
  tokenSymbol: string
}

/** Config that's specific to one checkout (one mount <div>). A page can have several. */
interface MountConfig {
  factureId: string
  amount: string
  onStatusCallbackName?: string
}

/** Reads `data-bank` / `data-token` off the <script> tag that loaded this file. */
function readScriptConfig(): ScriptConfig | undefined {
  // `document.currentScript` only reliably points at *this* <script> element
  // while the script's top-level code is still running synchronously — which
  // is exactly where we are right now, since this whole file runs top-level
  // and calls `init()` at the very end.
  const script = document.currentScript as HTMLScriptElement | null
  const bankAddress = script?.dataset.bank
  const tokenSymbol = script?.dataset.token
  if (!script || !bankAddress || !tokenSymbol) {
    log.error('[CNC Pay] missing data-bank/data-token on the widget <script> tag')
    return undefined
  }
  return { bankAddress: bankAddress as Address, tokenSymbol }
}

/** Reads `data-facture-id` / `data-amount` / `data-on-status` off one mount <div>. */
function readMountConfig(mount: HTMLElement): MountConfig | undefined {
  const factureId = mount.dataset.factureId
  const amount = mount.dataset.amount
  if (!factureId || !amount) {
    log.error('[CNC Pay] missing data-facture-id/data-amount on the widget mount element')
    return undefined
  }
  return { factureId, amount, onStatusCallbackName: mount.dataset.onStatus }
}

/**
 * Calls the merchant's `data-on-status` callback (a global function on
 * `window`, named by the merchant on the mount <div>) so their page can
 * react to payment progress — e.g. show its own spinner, redirect on
 * success, log a failed order. Silently does nothing if the merchant didn't
 * wire one up.
 */
function notifyStatus(
  callbackName: string | undefined,
  status: WidgetPaymentStatus | 'success' | 'failed',
  extra?: Record<string, unknown>
): void {
  if (!callbackName) return
  const callback = (window as unknown as Record<string, unknown>)[callbackName]
  if (typeof callback !== 'function') return
  try {
    ;(callback as (payload: Record<string, unknown>) => void)({ status, ...extra })
  } catch (error) {
    // A merchant's callback throwing shouldn't ever break the widget itself.
    log.error('[CNC Pay] data-on-status callback threw', error)
  }
}

/**
 * Matches the `data-token` symbol (e.g. "USDC") against the app's known
 * token list and returns its on-chain address + decimals — or `undefined`
 * if it's not a real token, or it's native POL.
 */
function resolveToken(tokenSymbol: string): WidgetToken | undefined {
  const token = SUPPORTED_TOKENS.find(
    (candidate) => candidate.symbol.toLowerCase() === tokenSymbol.toLowerCase()
  )
  // Native POL can't carry the facture ID (Bank.sol's receive() reverts on
  // non-empty calldata and has no fallback()) — v0 payments only support
  // depositToken() targets (USDC/USDCe).
  if (!token || token.id === 'native') return undefined
  return { address: token.address, symbol: token.symbol, decimals: token.decimals }
}

/** Sets up one widget instance inside one mount <div>. */
function mountWidget(mount: HTMLElement, script: ScriptConfig): void {
  const mountConfig = readMountConfig(mount)
  if (!mountConfig) return
  const { factureId, amount, onStatusCallbackName } = mountConfig

  // Shadow DOM: the widget's own DOM subtree, with its own style scope.
  // The host page's CSS can't reach in, and our CSS can't leak out.
  const shadow = mount.attachShadow({ mode: 'open' })
  const style = document.createElement('style')
  style.textContent = widgetStyles
  shadow.appendChild(style)
  // Vue mounts into a plain child element inside the shadow root, not the
  // shadow root itself.
  const container = document.createElement('div')
  shadow.appendChild(container)

  // Build one Vue app per widget instance and hand it everything it needs
  // as props — bank/token/amount/facture ID, plus the status callback.
  const app = createApp(WidgetApp, {
    bankAddress: script.bankAddress,
    token: resolveToken(script.tokenSymbol),
    tokenSymbolRaw: script.tokenSymbol,
    amount,
    factureId,
    onStatus: (
      status: WidgetPaymentStatus | 'success' | 'failed',
      extra?: Record<string, unknown>
    ) => notifyStatus(onStatusCallbackName, status, extra)
  })
  // Registers Nuxt UI's components (UCard, UButton, UIcon, UAlert, …) on
  // this app instance so WidgetApp.vue's template can use them.
  app.use(ui)
  app.mount(container)
}

/** Entry point: finds every checkout mount point on the page and boots a widget in each. */
function init(): void {
  const scriptConfig = readScriptConfig()
  if (!scriptConfig) return

  // Attribute-scanned rather than a fixed `#cnc-pay` id so a page can embed
  // more than one checkout with a single widget script tag.
  const mounts = document.querySelectorAll<HTMLElement>('[data-facture-id]')
  mounts.forEach((mount) => mountWidget(mount, scriptConfig))
}

// The documented embed snippet loads this script with `async`, which
// executes as soon as the fetch completes — not necessarily after the
// parser has reached a mount `<div>` declared later in the HTML (a fast or
// cached load, or the merchant placing the <script> tag in <head>). Scanning
// immediately in that case finds nothing and the widget silently never
// mounts. Deferring to `DOMContentLoaded` guarantees the initial HTML is
// fully parsed first; if it's already fired (a slow-loading script,
// `defer`, or a script injected after page load — see the merchant-driven
// re-mount pattern in Aurora's app.js) `readyState` is no longer 'loading'
// and we run immediately instead of waiting for an event that already fired.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true })
} else {
  init()
}
