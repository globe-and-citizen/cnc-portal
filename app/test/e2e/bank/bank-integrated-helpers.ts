import { expect, type Locator, type Page } from '@playwright/test'
import { parseAbiItem, type Address, type Hex } from 'viem'
import { publicClient } from '../e2e-chain'
import { dialogAmount, selectToken } from '../e2e-page'

export async function addressFrom(selector: Locator): Promise<Address> {
  const text = await selector.textContent()
  const [address] = text?.match(/0x[a-fA-F0-9]{40}/) ?? []
  if (!address) throw new Error('Expected a contract address in the account view')
  return address as Address
}

export async function depositUsdc(page: Page, amount: string): Promise<void> {
  await page.getByRole('button', { name: 'Deposit', exact: true }).click()
  const deposit = page.getByRole('dialog', { name: 'Deposit to Bank Contract' })
  await selectToken(page, deposit, 'USDC')
  await dialogAmount(deposit).fill(amount)
  await deposit.locator('[data-test="deposit-button"]').click()
  await expect(page.getByText('USDC deposited successfully', { exact: true })).toBeVisible({
    timeout: 30_000
  })
}

/** Match one portal deposit to the Bank event and successful mined receipt. */
export async function bankDepositReceipt(options: {
  bank: Address
  depositor: Address
  fromBlock: bigint
  amount: bigint
  token?: Address
}): Promise<Hex> {
  const { bank, depositor, fromBlock, amount, token } = options
  let hash: Hex

  if (token) {
    const deposits = await publicClient.getLogs({
      address: bank,
      event: parseAbiItem(
        'event TokenDeposited(address indexed depositor, address indexed token, uint256 amount)'
      ),
      args: { depositor, token },
      fromBlock: fromBlock + 1n,
      toBlock: 'latest'
    })
    expect(deposits).toHaveLength(1)
    expect(deposits[0]!.args.amount).toBe(amount)
    hash = deposits[0]!.transactionHash
  } else {
    const deposits = await publicClient.getLogs({
      address: bank,
      event: parseAbiItem('event Deposited(address indexed depositor, uint256 amount)'),
      args: { depositor },
      fromBlock: fromBlock + 1n,
      toBlock: 'latest'
    })
    expect(deposits).toHaveLength(1)
    expect(deposits[0]!.args.amount).toBe(amount)
    hash = deposits[0]!.transactionHash
  }

  const receipt = await publicClient.getTransactionReceipt({ hash })
  expect(receipt.status).toBe('success')
  expect(receipt.from.toLowerCase()).toBe(depositor.toLowerCase())
  expect(receipt.to?.toLowerCase()).toBe(bank.toLowerCase())
  return hash
}

/** Check that a reload reconstructed the same transaction in the visible Bank history. */
export async function expectBankHistoryEntry(
  page: Page,
  hash: Hex,
  label: string,
  amount: string
): Promise<void> {
  const history = page.locator('[data-test="bank-transactions"]')
  const abbreviatedHash = `${hash.slice(0, 6)}…${hash.slice(-4)}`
  const row = history.locator('tbody tr').filter({ hasText: abbreviatedHash })
  await expect(row).toHaveCount(1, { timeout: 30_000 })
  await expect(row).toContainText(label)
  await expect(row).toContainText(amount)
  await row.locator('[data-test="bank-transaction-detail-button"]').click()
  const detail = page.getByRole('dialog', { name: 'Transaction detail' })
  await expect(detail.getByRole('link', { name: 'Open in block explorer' })).toHaveAttribute(
    'href',
    new RegExp(`/tx/${hash}$`)
  )
  await detail.getByRole('button', { name: 'Close', exact: true }).last().click()
}
