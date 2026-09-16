// Expense-specific Playwright page helpers: the in-memory approval API and
// the navigation to the Expense Account.
import type { Page, Request } from '@playwright/test'
import type { Hex } from 'viem'
import { E2E_MEMBER_PRIVATE_KEY, E2E_OWNER } from '../e2e-chain'
import {
  json,
  openAccountFromSidebar,
  signInAndOpenFirstTeam,
  stubBackend,
  useWallet
} from '../e2e-page'
import type { BankE2EFixture } from '../bank/bank-chain'
import { currentUser, treasuryTeam, type TeamOptions } from '../bank/bank-page'
import {
  expenseApprovalStatus,
  type ExpenseApproval,
  type ExpenseApprovalData
} from './expense-chain'

export interface ExpenseRecord extends ExpenseApproval {
  id: number
  teamId: number
  userAddress: string
}

/** Stand-in for the backend's approval store, scoped to one test. */
export interface ExpenseApi {
  expenses: ExpenseRecord[]
  nextId: number
}

interface ExpensePostBody {
  data: Omit<ExpenseApprovalData, 'signedAgainstContractAddress' | 'chainId'>
  signature: Hex
  signedAgainstContractAddress: `0x${string}`
  chainId: number
}

const CREATED_AT = '2026-09-14T00:00:00.000Z'

export const createExpenseApi = (): ExpenseApi => ({ expenses: [], nextId: 1 })

export const addExpenseApproval = (api: ExpenseApi, approval: ExpenseApproval): ExpenseRecord => {
  const record: ExpenseRecord = {
    ...approval,
    id: api.nextId++,
    teamId: 1,
    userAddress: approval.data.approvedAddress
  }
  api.expenses.push(record)
  return record
}

const parseExpensePost = (request: Request): ExpenseApproval => {
  const body = request.postDataJSON() as ExpensePostBody
  return {
    signature: body.signature,
    data: {
      ...body.data,
      signedAgainstContractAddress: body.signedAgainstContractAddress,
      chainId: body.chainId
    }
  }
}

const expenseResponse = async (fixture: BankE2EFixture, record: ExpenseRecord) => {
  const { status, withdrawn } = await expenseApprovalStatus(fixture, record)
  return {
    id: record.id,
    teamId: record.teamId,
    userAddress: record.userAddress,
    signature: record.signature,
    data: record.data,
    status,
    balances: { 0: '0', 1: withdrawn },
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT
  }
}

const officersResponse = (fixture: BankE2EFixture, team: ReturnType<typeof treasuryTeam>) =>
  json([
    {
      id: 1,
      address: fixture.officer,
      version: null,
      teamId: 1,
      deployer: E2E_OWNER,
      deployBlockNumber: null,
      deployedAt: null,
      previousOfficerId: null,
      isCurrent: true,
      contracts: team.teamContracts.map((contract, index) => ({
        id: index + 1,
        ...contract,
        officerId: 1
      })),
      createdAt: CREATED_AT,
      updatedAt: CREATED_AT
    }
  ])

async function stubExpenseBackend(
  page: Page,
  fixture: BankE2EFixture,
  api: ExpenseApi,
  options: TeamOptions
): Promise<void> {
  const team = treasuryTeam(fixture, options)

  await stubBackend(page, {
    user: currentUser(options),
    team,
    respond: async (pathname, request) => {
      if (pathname === '/api/contract/officers') return officersResponse(fixture, team)
      if (pathname !== '/api/expense') return undefined
      if (request.method() === 'POST') {
        const record = addExpenseApproval(api, parseExpensePost(request))
        return json(await expenseResponse(fixture, record), 201)
      }
      return json(await Promise.all(api.expenses.map((record) => expenseResponse(fixture, record))))
    }
  })
}

/** Sign in through the E2E wallet and open the Expense Account page. */
export async function openExpenseAccount(
  page: Page,
  fixture: BankE2EFixture,
  api: ExpenseApi,
  options: TeamOptions = {}
): Promise<void> {
  if (options.user === 'member') await useWallet(page, E2E_MEMBER_PRIVATE_KEY)
  await stubExpenseBackend(page, fixture, api, options)
  await signInAndOpenFirstTeam(page)
  await openAccountFromSidebar(page, '/teams/1/accounts/expense-account')
}

/** Choose a real calendar day instead of mutating the approval form state. */
export async function chooseApprovalDate(page: Page, selector: string, day: Date): Promise<void> {
  await page.locator(selector).click()
  const value = [
    day.getFullYear(),
    String(day.getMonth() + 1).padStart(2, '0'),
    String(day.getDate()).padStart(2, '0')
  ].join('-')
  await page
    .locator('[data-reka-popper-content-wrapper] [data-state="open"]')
    .locator(`[data-value="${value}"]`)
    .click()
}
