// Expense-specific chain helpers: owner-signed approvals and their on-chain usage.
import { formatUnits, keccak256, parseUnits, zeroAddress, type Address, type Hex } from 'viem'
import { hardhat } from 'viem/chains'
import { artifact, E2E_MEMBER, ownerAccount, publicClient } from '../e2e-chain'
import type { BankE2EFixture } from '../bank/bank-chain'

export interface ExpenseApprovalData {
  amount: number
  frequencyType: number
  customFrequency: number
  startDate: number
  endDate: number
  tokenAddress: Address
  approvedAddress: Address
  signedAgainstContractAddress: Address
  chainId: number
}

export interface ExpenseApproval {
  data: ExpenseApprovalData
  signature: Hex
}

export interface ExpenseApprovalBalance {
  lastWithdrawnDate: bigint
  totalWithdrawn: bigint
  state: number
}

const ONE_TIME_FREQUENCY = 0
const DISABLED_STATE = 2
const USDC_DECIMALS = 6

const expenseArtifact = () =>
  artifact('artifacts/contracts/expense-account/ExpenseAccountEIP712.sol/ExpenseAccountEIP712.json')

const tokenDecimals = (token: Address) => (token === zeroAddress ? 18 : USDC_DECIMALS)

/** Build an approval exactly as the owner-facing UI signs it. */
export async function signExpenseApproval(
  fixture: BankE2EFixture,
  overrides: Partial<Omit<ExpenseApprovalData, 'signedAgainstContractAddress' | 'chainId'>> = {}
): Promise<ExpenseApproval> {
  const block = await publicClient.getBlock()
  const now = Number(block.timestamp)
  const data: ExpenseApprovalData = {
    amount: 5,
    frequencyType: ONE_TIME_FREQUENCY,
    customFrequency: 0,
    startDate: now - 60,
    endDate: now + 86_400,
    tokenAddress: fixture.usdc,
    approvedAddress: E2E_MEMBER,
    signedAgainstContractAddress: fixture.expenseAccount,
    chainId: hardhat.id,
    ...overrides
  }

  const signature = await ownerAccount.signTypedData({
    domain: {
      name: 'CNCExpenseAccount',
      version: '1',
      chainId: hardhat.id,
      verifyingContract: fixture.expenseAccount
    },
    types: {
      BudgetLimit: [
        { name: 'amount', type: 'uint256' },
        { name: 'frequencyType', type: 'uint8' },
        { name: 'customFrequency', type: 'uint256' },
        { name: 'startDate', type: 'uint256' },
        { name: 'endDate', type: 'uint256' },
        { name: 'tokenAddress', type: 'address' },
        { name: 'approvedAddress', type: 'address' }
      ]
    },
    primaryType: 'BudgetLimit',
    message: {
      amount: parseUnits(`${data.amount}`, tokenDecimals(data.tokenAddress)),
      frequencyType: data.frequencyType,
      customFrequency: BigInt(data.customFrequency),
      startDate: BigInt(data.startDate),
      endDate: BigInt(data.endDate),
      tokenAddress: data.tokenAddress,
      approvedAddress: data.approvedAddress
    }
  })

  return { data, signature }
}

/** Read the contract-owned usage state that the production API synchronizes. */
export async function readExpenseApprovalBalance(
  fixture: BankE2EFixture,
  signature: Hex
): Promise<ExpenseApprovalBalance> {
  const contract = await expenseArtifact()
  const balance = (await publicClient.readContract({
    address: fixture.expenseAccount,
    abi: contract.abi,
    functionName: 'getExpenseBalance',
    args: [keccak256(signature)]
  })) as { lastWithdrawnDate: bigint; totalWithdrawn: bigint; state: number }

  return {
    lastWithdrawnDate: balance.lastWithdrawnDate,
    totalWithdrawn: balance.totalWithdrawn,
    state: Number(balance.state)
  }
}

/** Derive the approval status the backend would report from the chain state. */
export async function expenseApprovalStatus(
  fixture: BankE2EFixture,
  approval: ExpenseApproval
): Promise<{ status: string; withdrawn: string }> {
  const [balance, block] = await Promise.all([
    readExpenseApprovalBalance(fixture, approval.signature),
    publicClient.getBlock()
  ])
  const withdrawn = formatUnits(balance.totalWithdrawn, tokenDecimals(approval.data.tokenAddress))

  if (approval.data.endDate <= Number(block.timestamp)) return { status: 'expired', withdrawn }
  if (balance.state === DISABLED_STATE) return { status: 'disabled', withdrawn }
  if (approval.data.frequencyType === ONE_TIME_FREQUENCY && balance.totalWithdrawn > 0n) {
    return { status: 'limit-reached', withdrawn }
  }
  return { status: 'enabled', withdrawn }
}
