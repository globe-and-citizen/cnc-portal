import type { Address, Hex } from 'viem'
import { keccak256 } from 'viem'
import type { Team } from '../../../src/types/team'
import { expenseAccountEip712Abi } from '../../../src/artifacts/abi/generated'
import { expect, test } from '../fixtures/integrated'
import { E2E_MEMBER_PRIVATE_KEY, ownerAccount, publicClient } from '../e2e-chain'
import { openAccountFromSidebar } from '../e2e-page'
import {
  approveExpenseSpending,
  redeployContractsThroughUi
} from '../accounting/accounting-operations'
import { authenticateIntegratedAccount, requestIntegratedApi } from '../integrated-api'

interface ExpenseApprovalRecord {
  id: number
  signature: Hex
  status: string
  balances: { 0: string; 1: string } | null
  data: { signedAgainstContractAddress: Address; chainId: number }
}

test.describe(
  '[US-EXP-004] Integrated Expense approval generations',
  { tag: ['@US-EXP-004', '@integrated'] },
  () => {
    test.setTimeout(360_000)

    test('[AC-US-EXP-004-14] retains an old approval as non-spendable history after redeployment', async ({
      authenticatedPage: ownerPage,
      walletPage,
      operationalTeam
    }) => {
      const company = await operationalTeam({ memberPrivateKeys: [E2E_MEMBER_PRIVATE_KEY] })
      const teamId = company.teamId
      const oldContract = company.team.teamContracts.find(
        (contract) => contract.type === 'ExpenseAccountEIP712'
      )?.address as Address
      expect(oldContract).toMatch(/^0x[0-9a-fA-F]{40}$/)

      await ownerPage.goto(`/teams/${teamId}`)
      await approveExpenseSpending(ownerPage, teamId, '5')
      const token = await authenticateIntegratedAccount(ownerAccount)
      const approvals = () =>
        requestIntegratedApi<ExpenseApprovalRecord[]>(`/expense?teamId=${teamId}`, { token })
      await expect.poll(async () => (await approvals()).length).toBe(1)
      const [approval] = await approvals()
      expect(approval?.data).toMatchObject({
        signedAgainstContractAddress: oldContract,
        chainId: 31_337
      })

      await ownerPage.locator('[data-test="disable-button"]').click()
      await expect(ownerPage.getByText('Approval deactivated', { exact: true })).toBeVisible({
        timeout: 30_000
      })
      await expect.poll(async () => (await approvals())[0]?.status).toBe('disabled')
      const approvalHash = keccak256(approval!.signature)
      const oldBalance = (await publicClient.readContract({
        address: oldContract,
        abi: expenseAccountEip712Abi,
        functionName: 'getExpenseBalance',
        args: [approvalHash]
      })) as { state: number }
      expect(Number(oldBalance.state)).toBe(2)

      await redeployContractsThroughUi(ownerPage, teamId)
      const currentTeam = await requestIntegratedApi<Team>(`/teams/${teamId}`, { token })
      const newContract = currentTeam.teamContracts.find(
        (contract) => contract.type === 'ExpenseAccountEIP712'
      )?.address
      expect(newContract?.toLowerCase()).not.toBe(oldContract.toLowerCase())

      const [historical] = await approvals()
      expect(historical).toMatchObject({ id: approval!.id, status: 'historical', balances: null })
      const newBalance = (await publicClient.readContract({
        address: newContract as Address,
        abi: expenseAccountEip712Abi,
        functionName: 'getExpenseBalance',
        args: [approvalHash]
      })) as { state: number }
      expect(Number(newBalance.state)).not.toBe(2)

      await openAccountFromSidebar(ownerPage, `/teams/${teamId}/accounts/expense-account`)
      await expect(
        ownerPage
          .locator('[data-test="claims-table"] table')
          .getByText('historical', { exact: true })
      ).toBeVisible()
      await expect(ownerPage.locator('[data-test="disable-button"]')).toHaveCount(0)
      await expect(ownerPage.locator('[data-test="enable-button"]')).toHaveCount(0)
      await ownerPage.reload()
      await expect(
        ownerPage
          .locator('[data-test="claims-table"] table')
          .getByText('historical', { exact: true })
      ).toBeVisible()

      const memberPage = await walletPage(E2E_MEMBER_PRIVATE_KEY)
      await memberPage.goto(`/teams/${teamId}/accounts/expense-account`)
      const memberHistory = memberPage.locator('[data-test="my-approved-expenses"]')
      await expect(memberHistory.getByText('historical', { exact: true })).toBeVisible()
      await expect(
        memberHistory.locator('[data-test="historical-expense-unavailable"]')
      ).toBeVisible()
      await expect(memberHistory.locator('[data-test="transfer-button"]')).toHaveCount(0)
      await memberPage.reload()
      await expect(memberHistory.getByText('historical', { exact: true })).toBeVisible()
      await expect(memberHistory.locator('[data-test="transfer-button"]')).toHaveCount(0)
    })
  }
)
