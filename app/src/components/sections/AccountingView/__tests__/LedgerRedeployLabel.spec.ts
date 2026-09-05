/**
 * A redeployed cash pocket reads as its own deployment in the general ledger.
 *
 * The numbering itself is covered in `pocketInstances.spec.ts` and its mapping into
 * rows in `ledgerPocketInstances.spec.ts`; here we only check that the table shows
 * the numbered name, flags the later deployment, and carries the contract with the
 * account when the row is clicked through to the trial balance.
 */
import { afterEach, beforeEach, describe, it, expect } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { NETWORK } from '@/constant'
import { renderWithProviders } from '@/tests/mocks'
import LedgerTable from '../LedgerTable.vue'
import {
  ledgerRows,
  buildPocketInstances,
  LEDGER_COLUMNS
} from '@/utils/accounting/ledgerPresenter'
import type { LedgerEntry } from '@/utils/accounting/ledgerEntry'

const BANK_1 = '0x1111111111111111111111111111111111111111'
const BANK_2 = '0x2222222222222222222222222222222222222222'
const TX_HASH = `0x${'a'.repeat(64)}`
const EXPLORER_URL = 'https://explorer.example'
let originalExplorerUrl: string | null | undefined

beforeEach(() => {
  originalExplorerUrl = NETWORK.blockExplorerUrl
  NETWORK.blockExplorerUrl = EXPLORER_URL
})

afterEach(() => {
  NETWORK.blockExplorerUrl = originalExplorerUrl
})

/** A deposit into one Bank contract — two of them make a redeployed pocket. */
function deposit(id: string, instance: string, timestamp: number, txHash?: string): LedgerEntry {
  return {
    id,
    timestamp,
    useCase: 'UC-BANK-02',
    debit: 'Cash — Bank',
    debitInstance: instance as `0x${string}`,
    credit: 'Service Revenue',
    amountUsd: 100,
    token: 'usdc',
    rawAmount: '100000000',
    internal: false,
    memo: '',
    enrichment: 'not-applicable',
    ...(txHash ? { txHash } : {})
  }
}

const REDEPLOYED = [deposit('a', BANK_1, 1_700_000_000), deposit('b', BANK_2, 1_700_086_400)]

function renderLedger(entries: LedgerEntry[]) {
  return renderWithProviders(LedgerTable, {
    props: {
      rows: ledgerRows(entries, buildPocketInstances(entries)),
      total: '$200.00',
      linkAccount: true
    },
    route: { params: { id: '42' } }
  })
}

describe('General ledger — redeployed pocket', () => {
  it('names the later deployment and flags it, leaving the original plain', async () => {
    const wrapper = renderLedger(REDEPLOYED)
    await flushPromises()

    expect(wrapper.text()).toContain('Cash — Bank 2')
    // One hint icon only — beside the later deployment, never the original.
    expect(wrapper.findAll('[data-test^="ledger-redeploy-hint-"]')).toHaveLength(1)
    expect(wrapper.find('[data-test="ledger-redeploy-hint-Cash — Bank 2"]').exists()).toBe(true)
  })

  it('carries the contract with the account when the row is clicked', async () => {
    const wrapper = renderLedger(REDEPLOYED)
    await flushPromises()

    // Both deployments share the account, so the click must say which contract it is.
    const links = wrapper.findAll('[data-test="ledger-account-link-Cash — Bank"]')
    expect(links).toHaveLength(2)
    await links[1]!.trigger('click')
    expect(wrapper.emitted('accountSelect')?.[0]).toEqual(['Cash — Bank', BANK_2])
  })

  it('shows no deployment name or hint on a book with no redeploy', async () => {
    const wrapper = renderLedger([deposit('a', BANK_1, 1_700_000_000)])
    await flushPromises()

    expect(wrapper.text()).toContain('Cash — Bank')
    expect(wrapper.text()).not.toContain('Cash — Bank 2')
    expect(wrapper.find('[data-test^="ledger-redeploy-hint-"]').exists()).toBe(false)
  })

  it('links each transaction hash once to the configured explorer, while leaving synthetic entries plain', async () => {
    const wrapper = renderLedger([
      deposit('a', BANK_1, 1_700_000_000, TX_HASH),
      deposit('synthetic', BANK_1, 1_700_086_400)
    ])
    await flushPromises()

    const hashes = wrapper.findAll('[data-test="ledger-tx-hash"]')
    expect(hashes).toHaveLength(2)
    expect(hashes[0]!.text()).toBe('0xaaaa...aaaa')
    expect(hashes[0]!.attributes('title')).toBe(TX_HASH)
    expect(hashes[0]!.attributes('href')).toBe(`${EXPLORER_URL}/tx/${TX_HASH}`)
    expect(hashes[0]!.attributes('target')).toBe('_blank')
    expect(hashes[0]!.attributes('rel')).toBe('noopener noreferrer')
    expect(hashes[1]!.text()).toBe('—')
    expect(hashes[1]!.attributes('href')).toBeUndefined()
  })

  it('resizes every General Ledger column, with reset and keyboard controls', async () => {
    const wrapper = renderLedger([deposit('a', BANK_1, 1_700_000_000, TX_HASH)])
    await flushPromises()

    const resizers = wrapper.findAll('[role="separator"][data-test$="-resizer"]')
    expect(resizers).toHaveLength(LEDGER_COLUMNS.length)
    expect(resizers.map((resizer) => resizer.attributes('aria-label'))).toEqual(
      LEDGER_COLUMNS.map((column) => `Resize ${column.label} column`)
    )

    const activityResizer = wrapper.find('[data-test="ledger-activity-resizer"]')
    expect(activityResizer.attributes('aria-valuemin')).toBe('180')
    expect(activityResizer.attributes('aria-valuemax')).toBe('640')

    await activityResizer.trigger('mousedown', { clientX: 100 })
    document.dispatchEvent(new MouseEvent('mousemove', { clientX: 160 }))
    document.dispatchEvent(new MouseEvent('mousemove', { clientX: 170 }))
    document.dispatchEvent(new MouseEvent('mouseup', { clientX: 170 }))
    await flushPromises()

    const activityHeader = wrapper
      .findAll('th')
      .find((header) => header.text().includes('Activity'))
    expect(activityHeader?.attributes('style')).toContain('width: 390px')

    await activityResizer.trigger('keydown', { key: 'ArrowLeft' })
    await flushPromises()
    expect(activityHeader?.attributes('style')).toContain('width: 366px')

    await activityResizer.trigger('dblclick')
    await flushPromises()
    expect(activityHeader?.attributes('style')).toContain('width: 320px')
  })

  it('resizes the balance column in an account drill-down', async () => {
    const wrapper = renderWithProviders(LedgerTable, {
      props: {
        rows: ledgerRows([deposit('a', BANK_1, 1_700_000_000)]),
        total: '$100.00',
        showBalance: true
      },
      route: { params: { id: '42' } }
    })
    await flushPromises()

    const balanceResizer = wrapper.find('[data-test="ledger-balance-resizer"]')
    expect(balanceResizer.attributes('aria-valuemin')).toBe('100')
    expect(balanceResizer.attributes('aria-valuemax')).toBe('280')

    await balanceResizer.trigger('keydown', { key: 'ArrowRight' })
    await flushPromises()

    const balanceHeader = wrapper.findAll('th').find((header) => header.text().includes('Balance'))
    expect(balanceHeader?.attributes('style')).toContain('width: 154px')
  })
})
