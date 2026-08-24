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
import { createApp, type App } from 'vue'
import ui from '@nuxt/ui/vue-plugin'
import type { Address } from 'viem'
// Import directly from `generalUtil`, not the `@/utils` barrel: the barrel's
// `export *` re-exports pull in every util module transitively, several of
// which import Vue/Pinia — dead weight this standalone widget bundle
// shouldn't pay for.
import { log } from '@/utils/generalUtil'
import { SUPPORTED_TOKENS } from '@/constant'
import type { WidgetPaymentStatus } from './payment'
import WidgetApp, { type WidgetToken } from './WidgetApp.vue'
// `?inline` tells Vite to return the fully compiled CSS as a plain string
// instead of injecting it into the page's <head> — we inject it ourselves,
// into the shadow root, a few lines down.
import widgetStyles from './style.css?inline'

export type CncPayStatusCallback = (
  status: WidgetPaymentStatus | 'success' | 'failed',
  extra?: Record<string, unknown>
) => void

export interface CncPayApi {
  /** Sets the facture ID for the next `show()` call. */
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

/** Reads `data-bank` / `data-token` off the <script> tag that loaded this file. */
function readScriptConfig(): { bankAddress: Address; tokenSymbol: string } | undefined {
  // `document.currentScript` only reliably points at *this* <script> element
  // while the script's top-level code is still running synchronously — which
  // is exactly where we are right now, since this whole file runs top-level.
  const script = document.currentScript as HTMLScriptElement | null
  const bankAddress = script?.dataset.bank
  const tokenSymbol = script?.dataset.token
  if (!script || !bankAddress || !tokenSymbol) {
    log.error('[CNC Pay] missing data-bank/data-token on the widget <script> tag')
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

const scriptConfig = readScriptConfig()

const state: { factureId?: string; amount?: string; onStatus?: CncPayStatusCallback } = {}

/** One shadow root + Vue app per mount element, so `show()` can be called again to reuse it. */
const instances = new WeakMap<HTMLElement, { shadow: ShadowRoot; app: App }>()

function resolveTarget(target: HTMLElement | string): HTMLElement | undefined {
  const element =
    typeof target === 'string' ? (document.querySelector<HTMLElement>(target) ?? undefined) : target
  if (!element) log.error('[CNC Pay] show() target not found:', target)
  return element
}

function show(target: HTMLElement | string): void {
  if (!scriptConfig) return
  if (!state.factureId || !state.amount) {
    log.error('[CNC Pay] call setFactureId/setAmount before show()')
    return
  }
  const mount = resolveTarget(target)
  if (!mount) return

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

  const app = createApp(WidgetApp, {
    bankAddress: scriptConfig.bankAddress,
    token: resolveToken(scriptConfig.tokenSymbol),
    tokenSymbolRaw: scriptConfig.tokenSymbol,
    amount: state.amount,
    factureId: state.factureId,
    onStatus: state.onStatus
  })
  // Registers Nuxt UI's components (UCard, UButton, UIcon, UAlert, …) on
  // this app instance so WidgetApp.vue's template can use them.
  app.use(ui)
  app.mount(container)
  instances.set(mount, { shadow, app })
}

window.CncPay = {
  setFactureId(factureId) {
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
            log.error('[CNC Pay] onStatus callback threw', error)
          }
        }
      : undefined
  },
  show
}
