/**
 * A redeployed cash pocket reads as its own deployment in the general ledger.
 *
 * The numbering itself is covered in `pocketInstances.spec.ts` and its mapping into
 * rows in `ledgerPocketInstances.spec.ts`; here we only check that the table shows
 * the numbered name, flags the later deployment, and carries the contract with the
 * account when the row is clicked through to the trial balance.
 */
import { describe, it, expect } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { renderWithProviders } from '@/tests/mocks'
import LedgerTable from '../LedgerTable.vue'
import { ledgerRows, buildPocketInstances } from '@/utils/accounting/ledgerPresenter'
import type { LedgerEntry } from '@/utils/accounting/ledgerEntry'

const BANK_1 = '0x1111111111111111111111111111111111111111'
const BANK_2 = '0x2222222222222222222222222222222222222222'

/** A deposit into one Bank contract — two of them make a redeployed pocket. */
function deposit(id: string, instance: string, timestamp: number): LedgerEntry {
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
    enrichment: 'not-applicable'
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
})
