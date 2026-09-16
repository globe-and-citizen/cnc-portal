// Browser-side helpers shared by every account journey: backend stubbing,
// the E2E wallet, sign-in navigation, and the dialog controls that the
// deposit and transfer forms have in common.
import { expect, type Locator, type Page, type Request, type Route } from '@playwright/test'
import type { Address, Hex } from 'viem'
import { E2E_RPC_URL } from '../../src/e2e/chain'

/** Playwright matches route strings against the normalized request URL. */
export const E2E_RPC_ROUTE = `${E2E_RPC_URL}/`
export const NONCE = '41vj7bz5Ow8oT5xaE'

/** Scoped to the backend origin so Vite source imports under `/src/api/` stay untouched. */
const API_ROUTE = /\/\/[^/]+(?::\d+)?\/api\//
const PRIVATE_KEY_STORAGE_KEY = 'cnc-e2e-private-key'
const REJECT_NEXT_TRANSACTION_STORAGE_KEY = 'cnc-e2e-reject-next-transaction'

export interface E2EUser {
  id?: string
  address: Address
  name: string
  imageUrl: null
}

export interface StubResponse {
  status: number
  contentType: string
  body: string
}

export interface BackendStub {
  /** The signed-in user; also the only entry of the user directory unless `users` is given. */
  user: E2EUser
  users?: E2EUser[]
  team: unknown
  /** Journey-specific endpoints, consulted before the common ones. */
  respond?: (pathname: string, request: Request) => Promise<StubResponse | undefined>
}

export const json = (body: unknown, status = 200): StubResponse => ({
  status,
  contentType: 'application/json',
  body: JSON.stringify(body)
})

function commonResponse(pathname: string, stub: BackendStub): StubResponse | undefined {
  if (pathname.startsWith('/api/v3/coins/')) {
    return json({ market_data: { current_price: { usd: 1, cad: 1, eur: 1, idr: 1, inr: 1 } } })
  }
  if (pathname.startsWith('/api/user/nonce/')) return json({ nonce: NONCE })
  if (pathname === '/api/auth/siwe') return json({ accessToken: 'e2e.test.token' })
  if (pathname === '/api/user') return json({ users: stub.users ?? [stub.user] })
  if (pathname.startsWith('/api/user/0x')) return json({ ...stub.user, nonce: NONCE })
  if (pathname === '/api/teams/1') return json(stub.team)
  if (pathname === '/api/teams') return json([stub.team])
  if (pathname === '/api/notification') return json([])
  return undefined
}

/**
 * Answer every backend call in-page. Unknown endpoints get an empty 200 so the
 * global 401 interceptor never logs the user out on a background request.
 */
export async function stubBackend(page: Page, stub: BackendStub): Promise<void> {
  await page.route(API_ROUTE, async (route) => {
    const request = route.request()
    const { pathname } = new URL(request.url())
    const response =
      (await stub.respond?.(pathname, request)) ?? commonResponse(pathname, stub) ?? json({})
    return route.fulfill(response)
  })
}

/** Make the in-browser mock connector sign with `privateKey` instead of Hardhat account #0. */
export async function useWallet(page: Page, privateKey: Hex): Promise<void> {
  await page.addInitScript(({ key, value }) => localStorage.setItem(key, value), {
    key: PRIVATE_KEY_STORAGE_KEY,
    value: privateKey
  })
}

export async function rejectNextWalletRequest(page: Page): Promise<void> {
  await page.evaluate(
    (key) => localStorage.setItem(key, 'true'),
    REJECT_NEXT_TRANSACTION_STORAGE_KEY
  )
}

export async function signInAndOpenFirstTeam(page: Page): Promise<void> {
  await page.goto('/')
  await page.getByTestId('sign-in').click()
  await expect(page).toHaveURL(/\/teams$/, { timeout: 60_000 })
  await page.locator('[data-test="team-card-1"] [data-test="team-link"]').click()
  await expect(page).toHaveURL(/\/teams\/1$/, { timeout: 30_000 })
}

/**
 * Reach an account page through the sidebar. Navigation stays inside the SPA:
 * a hard reload would drop the in-memory E2E wallet connection and land on
 * the locked-session screen instead of the account journey.
 */
export async function openAccountFromSidebar(page: Page, href: string): Promise<void> {
  const accountsMenu = page.locator('a[href="/teams/1/accounts/bank-account"]').filter({
    hasText: 'Accounts'
  })
  const accountsToggle = accountsMenu.locator('[aria-controls]')
  await accountsToggle.click()
  await expect(accountsToggle).toHaveAttribute('aria-expanded', 'true')
  await page.locator(`[data-slot="content"] a[href="${href}"]`).click()
  await expect(page).toHaveURL(new RegExp(`${href}$`, 'i'), { timeout: 30_000 })
}

export const dialogAmount = (dialog: Locator) => dialog.locator('input[data-test="amountInput"]')

export async function selectToken(page: Page, dialog: Locator, symbol: string): Promise<void> {
  await dialog.locator('[data-test="tokenSelect"]').click()
  await page.getByRole('option', { name: symbol, exact: true }).click()
}

export interface RpcCall {
  id: number
  method: string
  params?: unknown[]
}

/** Fail the selected JSON-RPC calls while letting the rest of the batch through. */
export async function failRpcCalls(
  route: Route,
  shouldFail: (call: RpcCall) => boolean,
  message: string
): Promise<void> {
  const payload = route.request().postDataJSON() as RpcCall | RpcCall[]
  const calls = Array.isArray(payload) ? payload : [payload]
  const failedIds = new Set(calls.filter(shouldFail).map((call) => call.id))
  if (failedIds.size === 0) return route.continue()

  const response = await route.fetch()
  const upstream = (await response.json()) as
    | { id: number; result?: unknown }
    | Array<{ id: number; result?: unknown }>
  const replace = (item: { id: number; result?: unknown }) =>
    failedIds.has(item.id)
      ? { jsonrpc: '2.0', id: item.id, error: { code: -32000, message } }
      : item
  const body = Array.isArray(upstream) ? upstream.map(replace) : replace(upstream)
  await route.fulfill({ response, contentType: 'application/json', body: JSON.stringify(body) })
}

/** Fail every `eth_getLogs` call while letting the rest of the RPC batch through. */
export const failLogReads = (route: Route) =>
  failRpcCalls(route, (call) => call.method === 'eth_getLogs', 'E2E log read failed')
