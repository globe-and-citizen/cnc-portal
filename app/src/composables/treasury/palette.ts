import type { AccountKey, TokenKey } from '@/types/treasury'

/**
 * Colour palette for the companies treasury views. Values mirror the design
 * mockup (`CNC Portal.dc.html`). Kept as plain hex so segments are renderer-
 * agnostic (charts, legends, inline bars) without depending on CSS variables.
 */

/** Per-account slice colours. */
export const ACCOUNT_COLORS: Record<AccountKey, string> = {
  Bank: '#7fe3bf',
  Safe: '#0f8a5f',
  Expense: '#3366ff',
  Cash: '#ffab00'
}

/** Per-token slice colours. */
export const TOKEN_COLORS: Record<TokenKey, string> = {
  POL: '#8247e5',
  USDC: '#3366ff',
  ETH: '#94a3b8',
  SHER: '#00bf7a'
}

/**
 * Cycled colours for the per-company aggregate slices. There is no fixed number
 * of companies, so segment `i` uses `COMPANY_COLORS[i % length]`.
 */
export const COMPANY_COLORS: string[] = [
  '#00bf7a',
  '#0f8a5f',
  '#3366ff',
  '#8247e5',
  '#8baaff',
  '#94a3b8',
  '#ffab00',
  '#00b8d9'
]

/** Stable display order for accounts (drives empty-slice ordering too). */
export const ACCOUNT_ORDER: AccountKey[] = ['Bank', 'Safe', 'Expense', 'Cash']

/** Stable display order for tokens. */
export const TOKEN_ORDER: TokenKey[] = ['POL', 'USDC', 'ETH', 'SHER']
