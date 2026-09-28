import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
// Read-only chain assertions for the Payroll integrated journeys. Contract
// writes remain browser-driven so these tests prove the product flow rather
// than creating a privileged test-only state.
import {
  decodeFunctionData,
  erc20Abi,
  keccak256,
  parseAbiItem,
  parseEther,
  parseUnits,
  zeroAddress,
  type Address,
  type Hex
} from 'viem'
import { expect } from '@playwright/test'
import { artifact, publicClient, tokenBalance, E2E_MEMBER } from '../e2e-chain'

const deploymentManifest = JSON.parse(
  readFileSync(
    fileURLToPath(
      new URL('../../../src/artifacts/deployed_addresses/chain-31337.json', import.meta.url)
    ),
    'utf8'
  )
) as Record<string, string>
export const payrollUsdc = deploymentManifest['MockTokens#USDC'] as Address

export interface WageClaimState {
  disabled: boolean
  paid: boolean
}

export async function companySherAddress(officer: Address): Promise<Address> {
  const officerArtifact = await artifact('artifacts/contracts/Officer.sol/Officer.json')
  const deployed = (await publicClient.readContract({
    address: officer,
    abi: officerArtifact.abi,
    functionName: 'getDeployedContracts'
  })) as Array<{ contractType: string; contractAddress: Address }>
  const investor = deployed.find((contract) =>
    ['Investor', 'InvestorV1'].includes(contract.contractType)
  )?.contractAddress
  if (!investor) throw new Error('The company Officer must expose its deployed SHER contract')
  return investor
}

export async function wageClaimState(
  cashRemuneration: Address,
  signature: Hex
): Promise<WageClaimState> {
  const cashRemunerationArtifact = await artifact(
    'artifacts/contracts/CashRemunerationEIP712.sol/CashRemunerationEIP712.json'
  )
  const signatureHash = keccak256(signature)
  const [disabled, paid] = await Promise.all([
    publicClient.readContract({
      address: cashRemuneration,
      abi: cashRemunerationArtifact.abi,
      functionName: 'getDisabledWageClaim',
      args: [signatureHash]
    }),
    publicClient.readContract({
      address: cashRemuneration,
      abi: cashRemunerationArtifact.abi,
      functionName: 'getPaidWageClaim',
      args: [signatureHash]
    })
  ])

  return { disabled: Boolean(disabled), paid: Boolean(paid) }
}

/** Read-only assertions for the real two-hour, three-asset Payroll withdrawal. */
export async function assertThreeAssetPayment(
  cashRemuneration: Address,
  usdc: Address,
  sher: Address,
  signature: Hex,
  before: { sher: bigint; native: bigint; block: bigint }
): Promise<void> {
  const sherDecimals = await publicClient.readContract({
    address: sher,
    abi: erc20Abi,
    functionName: 'decimals'
  })
  await expect
    .poll(() => tokenBalance(sher, E2E_MEMBER), { timeout: 30_000 })
    .toBe(before.sher + parseUnits('4', sherDecimals))
  const mint = await publicClient.getLogs({
    address: sher,
    event: parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 value)'),
    args: { from: zeroAddress, to: E2E_MEMBER },
    fromBlock: before.block + 1n,
    toBlock: 'latest'
  })
  expect(mint).toHaveLength(1)
  expect(mint[0]!.args.value).toBe(parseUnits('4', sherDecimals))
  const withdrawals = await publicClient.getLogs({
    address: cashRemuneration,
    event: parseAbiItem('event Withdraw(address indexed withdrawer, uint256 amount)'),
    args: { withdrawer: E2E_MEMBER },
    fromBlock: before.block + 1n,
    toBlock: 'latest'
  })
  expect(withdrawals).toHaveLength(1)
  expect(withdrawals[0]!.args.amount).toBe(parseEther('0.002'))
  const receipt = await publicClient.getTransactionReceipt({
    hash: withdrawals[0]!.transactionHash!
  })
  expect(receipt.status).toBe('success')
  const nativeAfter = await publicClient.getBalance({ address: E2E_MEMBER })
  expect(nativeAfter + receipt.gasUsed * receipt.effectiveGasPrice).toBe(
    before.native + parseEther('0.002')
  )
  const cashArtifact = await artifact(
    'artifacts/contracts/CashRemunerationEIP712.sol/CashRemunerationEIP712.json'
  )
  const transaction = await publicClient.getTransaction({ hash: receipt.transactionHash })
  const decoded = decodeFunctionData({ abi: cashArtifact.abi, data: transaction.input })
  expect(decoded.functionName).toBe('withdraw')
  expect(decoded.args).toEqual([
    expect.objectContaining({
      employeeAddress: E2E_MEMBER,
      minutesWorked: 120,
      wages: [
        { hourlyRate: parseEther('0.001'), tokenAddress: zeroAddress },
        { hourlyRate: parseUnits('1', 6), tokenAddress: usdc },
        { hourlyRate: parseUnits('2', sherDecimals), tokenAddress: sher }
      ]
    }),
    signature
  ])
}
