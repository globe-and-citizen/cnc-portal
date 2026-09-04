/**
 * Widget entry point — bundled standalone by `vite.widget.config.ts` into
 * `widget.js`, loaded on a third-party page via
 * `<script src=".../widget.js" data-bank="0x…" data-token="USDC" async>`.
 * Bank address and token live on the `<script>` tag (one widget config per
 * page, read once at load); facture ID, amount and status callback are
 * per-checkout and set imperatively through the `window.CncPay` API below —
 * no per-order `<script>`/`<div>` pair to (re)create, and no server-side
 * config to store anywhere.
 *
 * Renders `WidgetApp.vue` (real Nuxt UI components — `UCard`/`UButton`/
 * `UIcon`/`UAlert`) into a shadow root per mount point, with `widget.css`'s
 * compiled Tailwind/Nuxt UI CSS injected as an inline `<style>` so it stays
 * scoped to the widget and never leaks onto (or clashes with) the host page.
 */
import { createApp, type App, type Component } from 'vue'
import ui from '@nuxt/ui/vue-plugin'
import type { Address } from 'viem'
import { SUPPORTED_TOKENS } from '@/constant'
import type { WidgetPaymentStatus } from './payment'
import WidgetApp, { type WidgetToken } from './WidgetApp.vue'
import WidgetMisconfigured from './WidgetMisconfigured.vue'
// `?inline` tells Vite to return the fully compiled CSS as a plain string
// instead of injecting it into the page's <head> — we inject it ourselves,
// into the shadow root, a few lines down.
import widgetStyles from './style.css?inline'

export type CncPayStatusCallback = (
  status: WidgetPaymentStatus | 'success' | 'failed',
  extra?: Record<string, unknown>
) => void

export interface CncPayApi {
  /**
   * Sets the facture ID for the next `show()` call. Must be a short
   * identifier — up to {@link FACTURE_ID_MAX_LENGTH} characters from
   * {@link FACTURE_ID_PATTERN} (letters, digits, `-_./:`) — not free text;
   * it's permanently readable on-chain and rendered as-is in every
   * transaction table. Throws synchronously on an invalid value — this is
   * an integration bug, not something a shopper should ever see silently
   * pass through, so it surfaces to the merchant's own code in every build
   * rather than being swallowed.
   */
  setFactureId(factureId: string): void
  /** Sets the amount (in the token's display units, e.g. "25.00") for the next `show()` call. */
  setAmount(amount: string): void
  /** Sets (or replaces) the callback notified of payment progress/outcome. */
  setOnStatus(callback: CncPayStatusCallback | undefined): void
  /**
   * Renders the widget into `target` using the facture ID/amount set via
   * `setFactureId`/`setAmount`. Safe to call again on the same target for a
   * new order — the previous instance is torn down first.
   */
  show(target: HTMLElement | string): void
}

declare global {
  interface Window {
    CncPay: CncPayApi
  }
}

/**
 * Finds the widget's own <script> tag. `document.currentScript` is set to
 * whichever <script> is currently executing its top-level code — exactly
 * this one, at this point — and unlike matching on `data-bank`/`data-token`,
 * that identification doesn't depend on either attribute actually being
 * present, and can't accidentally match some *other* script tag on the
 * host page. This only works for a classic script (`build.lib.formats` is
 * `'iife'` in `vite.widget.config.ts` — never `'es'`, so every real embed
 * loads this way, `async` included); `document.currentScript` is always
 * `null` for a `type="module"` script, which is how Vite's dev server
 * serves this entry — `widget/dev/index.html` is our own harness page, so
 * falling back to an attribute match there is safe.
 */
function widgetScriptTag(): HTMLScriptElement | undefined {
  if (document.currentScript instanceof HTMLScriptElement) return document.currentScript
  return (
    document.querySelector<HTMLScriptElement>('script[data-bank], script[data-token]') ?? undefined
  )
}

/** Reads `data-bank` / `data-token` off the widget's own <script> tag. */
function readScriptConfig(): { bankAddress: Address; tokenSymbol: string } | undefined {
  const script = widgetScriptTag()
  const bankAddress = script?.dataset.bank
  const tokenSymbol = script?.dataset.token
  if (!bankAddress || !tokenSymbol) {
    const missing = [!bankAddress && 'data-bank', !tokenSymbol && 'data-token']
      .filter((attr): attr is string => Boolean(attr))
      .join('/')
    // Unconditional `console.error`, not the app's `log` util: `log`'s
    // methods are dev-mode-only (see `@/lib/logging`), which is right for
    // internal app telemetry but wrong here — this fires inside a merchant's
    // own production page, and it's the only diagnostic they get for a
    // broken embed snippet.
    console.error(`[CNC Pay] missing ${missing} on the widget <script> tag`)
    return undefined
  }
  return { bankAddress: bankAddress as Address, tokenSymbol }
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

// A facture ID is an order reference, not free text — it's permanently
// readable on-chain and rendered as-is in every transaction table, so it's
// worth rejecting obvious misuse (a sentence, a pasted note) at the source
// instead of letting it travel all the way to an on-chain tx.
const FACTURE_ID_MAX_LENGTH = 64
const FACTURE_ID_PATTERN = /^[A-Za-z0-9\-_./:]+$/

function isValidFactureId(factureId: string): boolean {
  return (
    factureId.length > 0 &&
    factureId.length <= FACTURE_ID_MAX_LENGTH &&
    FACTURE_ID_PATTERN.test(factureId)
  )
}

const scriptConfig = readScriptConfig()

const state: { factureId?: string; amount?: string; onStatus?: CncPayStatusCallback } = {}

/** One shadow root + Vue app per mount element, so `show()` can be called again to reuse it. */
const instances = new WeakMap<HTMLElement, { shadow: ShadowRoot; app: App }>()

function resolveTarget(target: HTMLElement | string): HTMLElement | undefined {
  const element =
    typeof target === 'string' ? (document.querySelector<HTMLElement>(target) ?? undefined) : target
  if (!element) console.error('[CNC Pay] show() target not found:', target)
  return element
}

/**
 * Mounts `component` into `mount`'s shadow root, tearing down whatever was
 * there before. Shared by the real payment card and the misconfigured-embed
 * fallback below — both need the same host-page CSS isolation.
 */
function mountInShadowRoot(
  mount: HTMLElement,
  component: Component,
  props: Record<string, unknown>
): void {
  const existing = instances.get(mount)
  if (existing) {
    existing.app.unmount()
    existing.shadow.innerHTML = ''
  }
  // The host page's CSS can't reach into a shadow root, and our CSS can't
  // leak out — a fresh shadow root is only created once per mount element.
  const shadow = existing?.shadow ?? mount.attachShadow({ mode: 'open' })
  const style = document.createElement('style')
  style.textContent = widgetStyles
  shadow.appendChild(style)
  const container = document.createElement('div')
  shadow.appendChild(container)

  const app = createApp(component, props)
  // Registers Nuxt UI's components (UCard, UButton, UIcon, UAlert, …) on
  // this app instance so the mounted component's template can use them.
  app.use(ui)
  app.mount(container)
  instances.set(mount, { shadow, app })
}

function show(target: HTMLElement | string): void {
  const mount = resolveTarget(target)
  if (!mount) return

  // A broken embed snippet (missing data-bank/data-token) is a merchant
  // mistake, not a shopper one — but the shopper is the one looking at this
  // page, so they still need to see *something* rather than an empty box
  // with no explanation. `readScriptConfig` already logged the diagnostic
  // the merchant needs, above.
  if (!scriptConfig) {
    mountInShadowRoot(mount, WidgetMisconfigured, {})
    return
  }

  if (!state.factureId || !state.amount) {
    console.error('[CNC Pay] call setFactureId/setAmount before show()')
    return
  }

  mountInShadowRoot(mount, WidgetApp, {
    bankAddress: scriptConfig.bankAddress,
    token: resolveToken(scriptConfig.tokenSymbol),
    tokenSymbolRaw: scriptConfig.tokenSymbol,
    amount: state.amount,
    factureId: state.factureId,
    onStatus: state.onStatus
  })
}

window.CncPay = {
  setFactureId(factureId) {
    if (!isValidFactureId(factureId)) {
      throw new Error(
        `[CNC Pay] Invalid facture ID ${JSON.stringify(factureId)} — must be 1-${FACTURE_ID_MAX_LENGTH} characters matching ${FACTURE_ID_PATTERN}, not free text.`
      )
    }
    state.factureId = factureId
  },
  setAmount(amount) {
    state.amount = amount
  },
  setOnStatus(callback) {
    // A merchant's callback throwing shouldn't ever break the widget itself.
    state.onStatus = callback
      ? (status, extra) => {
          try {
            callback(status, extra)
          } catch (error) {
            console.error('[CNC Pay] onStatus callback threw', error)
          }
        }
      : undefined
  },
  show
}
