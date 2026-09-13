// Bank-specific Playwright page, backend, RPC, and wallet helpers.
import { expect, type Locator, type Page, type Route } from '@playwright/test'
import { parseEther, parseUnits, type Hex } from 'viem'
import {
  bankNativeBalance,
  E2E_OWNER,
  E2E_RECIPIENT,
  E2E_RECIPIENT_PRIVATE_KEY,
  nativeBalance,
  sendNative,
  sendToken,
  tokenBalance,
  type BankE2EFixture
} from './bank-chain'

export const E2E_RPC_URL = 'http://127.0.0.1:8546/'

const NONCE = '41vj7bz5Ow8oT5xaE'
const PRIVATE_KEY_STORAGE_KEY = 'cnc-e2e-private-key'
const REJECT_NEXT_TRANSACTION_STORAGE_KEY = 'cnc-e2e-reject-next-transaction'

interface TeamOptions {
  archived?: boolean
  user?: 'owner' | 'member'
}

const json = (body: unknown) => ({
  status: 200,
  contentType: 'application/json',
  body: JSON.stringify(body)
})

const bankTeam = (fixture: BankE2EFixture, { archived = false }: TeamOptions = {}) => ({
  id: '1',
  name: 'E2E Bank Team',
  slug: 'e2e-bank-team',
  description: 'A deterministic team used by the Bank Account E2E suite.',
  isHidden: false,
  isArchived: archived,
  isMigrated: true,
  ownerAddress: E2E_OWNER,
  members: [
    {
      id: 'owner-1',
      name: 'E2E Owner',
      address: E2E_OWNER,
      teamId: 1
    },
    {
      id: 'recipient-1',
      name: 'E2E Recipient',
      address: E2E_RECIPIENT,
      teamId: 1
    }
  ],
  currentOfficer: { address: fixture.officer },
  teamContracts: [
    { address: fixture.bank, type: 'Bank', deployer: E2E_OWNER, admins: [] },
    {
      address: fixture.board,
      type: 'BoardOfDirectors',
      deployer: E2E_OWNER,
      admins: []
    },
    {
      address: fixture.cashRemuneration,
      type: 'CashRemunerationEIP712',
      deployer: E2E_OWNER,
      admins: []
    },
    {
      address: fixture.expenseAccount,
      type: 'ExpenseAccountEIP712',
      deployer: E2E_OWNER,
      admins: []
    }
  ]
})

async function useWallet(page: Page, privateKey: Hex): Promise<void> {
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

export async function exerciseCashOutRecovery(page: Page, fixture: BankE2EFixture): Promise<void> {
  await sendNative(fixture.cashRemuneration, '1')
  await sendToken(fixture.usdc, fixture.cashRemuneration, '2')
  await sendNative(fixture.expenseAccount, '1')
  await sendToken(fixture.usdc, fixture.expenseAccount, '3')
  await sendNative(fixture.bank, '1')
  await sendToken(fixture.usdc, fixture.bank, '4')
  await signInAndOpenTeam(page, fixture)

  const cashOutButton = page.locator('[data-test="cash-out-all-button"]')
  await expect(cashOutButton).toBeEnabled({ timeout: 30_000 })
  await cashOutButton.click()
  await expect(page.locator('[data-test="cash-out-review-cashRemuneration"]')).toBeVisible()
  await expect(page.locator('[data-test="cash-out-review-expense"]')).toBeVisible()
  await rejectNextWalletRequest(page)
  await page.locator('[data-test="cash-out-all-confirm"]').click()

  await expect(page.locator('[data-test="cash-out-error-cashRemuneration"]')).toContainText(
    'You rejected the request.',
    { timeout: 30_000 }
  )
  await expect
    .poll(() => tokenBalance(fixture.usdc, fixture.cashRemuneration))
    .toBe(parseUnits('2', 6))
  await expect
    .poll(() => tokenBalance(fixture.usdc, fixture.expenseAccount))
    .toBe(parseUnits('3', 6))

  await page.locator('[data-test="cash-out-all-retry"]').click()
  await expect(page.locator('[data-test="cash-out-complete"]')).toBeVisible({
    timeout: 60_000
  })
  for (const contract of [fixture.cashRemuneration, fixture.expenseAccount, fixture.bank]) {
    await expect.poll(() => nativeBalance(contract)).toBe(0n)
    await expect.poll(() => tokenBalance(fixture.usdc, contract)).toBe(0n)
  }
}

async function stubBackend(
  page: Page,
  fixture: BankE2EFixture,
  options: TeamOptions = {}
): Promise<void> {
  const user =
    options.user === 'member'
      ? { address: E2E_RECIPIENT, name: 'E2E Recipient', nonce: NONCE, imageUrl: null }
      : { address: E2E_OWNER, name: 'E2E Owner', nonce: NONCE, imageUrl: null }

  await page.route(/\/\/[^/]+(?::\d+)?\/api\//, (route) => {
    const { pathname } = new URL(route.request().url())
    const team = bankTeam(fixture, options)

    if (pathname.startsWith('/api/v3/coins/')) {
      return route.fulfill(
        json({
          market_data: {
            current_price: { usd: 1, cad: 1, eur: 1, idr: 1, inr: 1 }
          }
        })
      )
    }
    if (pathname.startsWith('/api/user/nonce/')) return route.fulfill(json({ nonce: NONCE }))
    if (pathname === '/api/auth/siwe') return route.fulfill(json({ accessToken: 'e2e.test.token' }))
    if (pathname.startsWith('/api/user/0x')) return route.fulfill(json(user))
    if (pathname === '/api/teams/1') return route.fulfill(json(team))
    if (pathname === '/api/teams') return route.fulfill(json([team]))
    if (pathname === '/api/notification') return route.fulfill(json([]))

    return route.fulfill(json({}))
  })
}

export async function signInAndOpenTeam(
  page: Page,
  fixture: BankE2EFixture,
  options: TeamOptions = {}
): Promise<void> {
  if (options.user === 'member') await useWallet(page, E2E_RECIPIENT_PRIVATE_KEY)
  await stubBackend(page, fixture, options)
  await page.goto('/')
  await page.getByTestId('sign-in').click()
  await expect(page).toHaveURL(/\/teams$/, { timeout: 60_000 })
  await page.locator('[data-test="team-card-1"] [data-test="team-link"]').click()
  await expect(page).toHaveURL(/\/teams\/1$/, { timeout: 30_000 })
}

async function navigateToBankAccount(page: Page): Promise<void> {
  // Keep navigation in the SPA. A hard page reload deliberately drops the
  // in-memory E2E wallet connection and would exercise the locked-session
  // screen rather than the Bank Account journey.
  const accountsMenu = page.locator('a[href="/teams/1/accounts/bank-account"]').filter({
    hasText: 'Accounts'
  })
  const accountsToggle = accountsMenu.locator('[aria-controls]')
  await accountsToggle.click()
  await expect(accountsToggle).toHaveAttribute('aria-expanded', 'true')
  await page.locator('[data-slot="content"] a[href="/teams/1/accounts/bank-account"]').click()
  await expect(page).toHaveURL(/\/teams\/1\/accounts\/bank-account$/, { timeout: 30_000 })
}

export async function openBankAccount(
  page: Page,
  fixture: BankE2EFixture,
  options: TeamOptions = {}
): Promise<void> {
  await signInAndOpenTeam(page, fixture, options)
  await navigateToBankAccount(page)
}

export async function exerciseMemberBankAccess(page: Page, fixture: BankE2EFixture): Promise<void> {
  await sendToken(fixture.usdc, fixture.bank, '2')
  await sendToken(fixture.usdc, E2E_RECIPIENT, '5')
  const memberTokenBefore = await tokenBalance(fixture.usdc, E2E_RECIPIENT)

  await signInAndOpenTeam(page, fixture, { user: 'member' })
  await expect(page.locator('[data-test="cash-out-all-button"]')).toHaveCount(0)
  await navigateToBankAccount(page)

  await expect(page.locator('[data-test="bank-total-usd"]')).toHaveText('$2.00')
  await expect(page.locator('[data-test="bank-total-local"]')).toContainText('$2.00 USD')
  await expect(page.locator('[data-test="contract-owner-name"]')).toHaveText('E2E Owner')
  await expect(page.locator('[data-test="bank-contract-address"]')).toContainText(fixture.bank)
  await expect(page.getByText('Token Holding', { exact: true })).toBeVisible()
  await expect(page.locator('[data-test="transfer-button"]')).toBeDisabled()

  await page.getByRole('button', { name: 'Deposit', exact: true }).click()
  let deposit = page.getByRole('dialog', { name: 'Deposit to Bank Contract' })
  await dialogAmount(deposit).fill('0.5')
  await deposit.locator('[data-test="deposit-button"]').click()
  await expect(page.getByText('GO deposited successfully', { exact: true })).toBeVisible({
    timeout: 30_000
  })
  await expect.poll(() => bankNativeBalance(fixture.bank)).toBe(parseEther('0.5'))

  await page.getByRole('button', { name: 'Deposit', exact: true }).click()
  deposit = page.getByRole('dialog', { name: 'Deposit to Bank Contract' })
  await selectToken(page, deposit, 'USDC')
  await dialogAmount(deposit).fill('1')
  await deposit.locator('[data-test="deposit-button"]').click()
  await expect(page.getByText('USDC deposited successfully', { exact: true })).toBeVisible({
    timeout: 30_000
  })
  await expect.poll(() => tokenBalance(fixture.usdc, fixture.bank)).toBe(parseUnits('3', 6))
  await expect
    .poll(() => tokenBalance(fixture.usdc, E2E_RECIPIENT))
    .toBe(memberTokenBefore - parseUnits('1', 6))
  await expect(page.locator('[data-test="bank-total-usd"]')).toHaveText('$3.50', {
    timeout: 30_000
  })

  const history = page.locator('[data-test="bank-transactions"]')
  await expect(history.getByText('Deposit', { exact: true })).toBeVisible({ timeout: 30_000 })
  await expect(history.getByText('Token deposit', { exact: true })).toBeVisible()
  await expect(history.getByText('E2E Recipient', { exact: true }).first()).toBeVisible()
  await history.locator('[data-test="bank-transaction-detail-button"]').first().click()
  await expect(page.getByText('Transaction detail', { exact: true })).toBeVisible()
  await page
    .getByRole('dialog', { name: 'Transaction detail' })
    .getByRole('button', { name: 'Close', exact: true })
    .last()
    .click()

  await history.locator('[data-test="bank-transaction-history-type-filter"]').click()
  await page.getByRole('option', { name: 'Token deposit', exact: true }).click()
  await expect(history.locator('tbody').getByText('Token deposit', { exact: true })).toHaveCount(1)
  await history.locator('[data-test="bank-transaction-history-date-select"] button').click()
  await page.locator('[data-test="date-picker-month-previous"]').click()
  await expect(history.locator('[data-test="bank-transactions-empty"]')).toBeVisible()
}

export const dialogAmount = (dialog: Locator) => dialog.locator('input[data-test="amountInput"]')

export async function selectToken(page: Page, dialog: Locator, symbol: string): Promise<void> {
  await dialog.locator('[data-test="tokenSelect"]').click()
  await page.getByRole('option', { name: symbol, exact: true }).click()
}

export async function selectRecipient(dialog: Locator): Promise<void> {
  await dialog.getByPlaceholder('Address').fill(E2E_RECIPIENT)
  await dialog.getByText('E2E Recipient', { exact: true }).click()
}

export async function failLogReads(route: Route): Promise<void> {
  const payload = route.request().postDataJSON() as
    | { id: number; method: string }
    | Array<{ id: number; method: string }>
  const calls = Array.isArray(payload) ? payload : [payload]
  const failedIds = new Set(
    calls.filter((call) => call.method === 'eth_getLogs').map((call) => call.id)
  )
  if (failedIds.size === 0) return route.continue()

  const response = await route.fetch()
  const upstream = (await response.json()) as
    | { id: number; result?: unknown }
    | Array<{ id: number; result?: unknown }>
  const replace = (item: { id: number; result?: unknown }) =>
    failedIds.has(item.id)
      ? {
          jsonrpc: '2.0',
          id: item.id,
          error: { code: -32000, message: 'E2E log read failed' }
        }
      : item
  const body = Array.isArray(upstream) ? upstream.map(replace) : replace(upstream)
  await route.fulfill({ response, contentType: 'application/json', body: JSON.stringify(body) })
}
