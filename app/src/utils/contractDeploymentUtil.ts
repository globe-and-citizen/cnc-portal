import { type Address, parseUnits } from 'viem'
import { encodeFunctionData, zeroAddress } from 'viem'
import {
  BANK_BEACON_ADDRESS,
  BOD_BEACON_ADDRESS,
  CASH_REMUNERATION_EIP712_BEACON_ADDRESS,
  EXPENSE_ACCOUNT_EIP712_BEACON_ADDRESS,
  INVESTOR_BEACON_ADDRESS,
  PROPOSALS_BEACON_ADDRESS,
  ELECTIONS_BEACON_ADDRESS,
  SAFE_DEPOSIT_ROUTER_BEACON_ADDRESS,
  VESTING_BEACON_ADDRESS,
  FIXED_RETURN_BEACON_ADDRESS,
  USDC_ADDRESS,
  USDT_ADDRESS,
  USDC_E_ADDRESS
} from '@/constant'
import { BANK_ABI } from '@/artifacts/abi/bank'
import { EXPENSE_ACCOUNT_EIP712_ABI } from '@/artifacts/abi/expense-account-eip712'
import { CASH_REMUNERATION_EIP712_ABI } from '@/artifacts/abi/cash-remuneration-eip712'
import { ELECTIONS_ABI } from '@/artifacts/abi/elections'
import { INVESTOR_V2_ABI } from '@/artifacts/abi/investorV2'
import { SAFE_DEPOSIT_ROUTER_ABI } from '@/artifacts/abi/safe-deposit-router'
import { PROPOSALS_ABI } from '@/artifacts/abi/proposals'
import { FIXED_RETURN_ABI } from '@/artifacts/abi/fixed-return'
import { VESTING_ABI } from '@/artifacts/abi/vesting'

/**
 * Beacon configuration type
 */
interface BeaconConfig {
  beaconType: string
  beaconAddress: Address
}

/**
 * Deployment configuration type
 */
interface DeploymentConfig {
  contractType: string
  initializerData: `0x${string}`
}

/**
 * Validates that all required beacon addresses are defined
 * @throws Error if any beacon address is missing
 */
export const validateBeaconAddresses = (): void => {
  const requiredBeacons = [
    { name: 'BANK_BEACON_ADDRESS', value: BANK_BEACON_ADDRESS },
    { name: 'BOD_BEACON_ADDRESS', value: BOD_BEACON_ADDRESS },
    { name: 'PROPOSALS_BEACON_ADDRESS', value: PROPOSALS_BEACON_ADDRESS },
    {
      name: 'EXPENSE_ACCOUNT_EIP712_BEACON_ADDRESS',
      value: EXPENSE_ACCOUNT_EIP712_BEACON_ADDRESS
    },
    {
      name: 'CASH_REMUNERATION_EIP712_BEACON_ADDRESS',
      value: CASH_REMUNERATION_EIP712_BEACON_ADDRESS
    },
    { name: 'INVESTOR_BEACON_ADDRESS', value: INVESTOR_BEACON_ADDRESS },
    { name: 'ELECTIONS_BEACON_ADDRESS', value: ELECTIONS_BEACON_ADDRESS },
    {
      name: 'SAFE_DEPOSIT_ROUTER_BEACON_ADDRESS',
      value: SAFE_DEPOSIT_ROUTER_BEACON_ADDRESS
    },
    { name: 'VESTING_BEACON_ADDRESS', value: VESTING_BEACON_ADDRESS },
    { name: 'FIXED_RETURN_BEACON_ADDRESS', value: FIXED_RETURN_BEACON_ADDRESS }
  ]

  const missingBeacons = requiredBeacons.filter((beacon) => !beacon.value)

  if (missingBeacons.length > 0) {
    const missingNames = missingBeacons.map((b) => b.name).join(', ')
    throw new Error(`Missing beacon addresses: ${missingNames}`)
  }
}

/**
 * Gets the beacon configurations for contract deployment
 * @returns Array of beacon configurations
 */
export const getBeaconConfigs = (): BeaconConfig[] => {
  return [
    {
      beaconType: 'Bank',
      beaconAddress: BANK_BEACON_ADDRESS!
    },
    {
      beaconType: 'BoardOfDirectors',
      beaconAddress: BOD_BEACON_ADDRESS!
    },
    {
      beaconType: 'Proposals',
      beaconAddress: PROPOSALS_BEACON_ADDRESS!
    },
    {
      beaconType: 'ExpenseAccountEIP712',
      beaconAddress: EXPENSE_ACCOUNT_EIP712_BEACON_ADDRESS!
    },
    {
      beaconType: 'CashRemunerationEIP712',
      beaconAddress: CASH_REMUNERATION_EIP712_BEACON_ADDRESS!
    },
    {
      beaconType: 'Investor',
      beaconAddress: INVESTOR_BEACON_ADDRESS!
    },
    {
      beaconType: 'Elections',
      beaconAddress: ELECTIONS_BEACON_ADDRESS!
    },
    {
      beaconType: 'SafeDepositRouter',
      beaconAddress: SAFE_DEPOSIT_ROUTER_BEACON_ADDRESS!
    },
    {
      beaconType: 'Vesting',
      beaconAddress: VESTING_BEACON_ADDRESS!
    },
    {
      beaconType: 'FixedReturn',
      beaconAddress: FIXED_RETURN_BEACON_ADDRESS!
    }
  ]
}

/**
 * Generates deployment configurations for all contracts
 * @param currentUserAddress - The address of the current user
 * @param investorInput - Name and symbol for the investor contract
 * @returns Array of deployment configurations
 */
export const getDeploymentConfigs = (
  currentUserAddress: Address,
  investorInput: { name: string; symbol: string }
): DeploymentConfig[] => {
  const deployments: DeploymentConfig[] = []

  // Bank contract
  deployments.push({
    contractType: 'Bank',
    initializerData: encodeFunctionData({
      abi: BANK_ABI,
      functionName: 'initialize',
      args: [[USDT_ADDRESS, USDC_ADDRESS, USDC_E_ADDRESS], currentUserAddress]
    })
  })

  // Investor contract (v2 — brand-new teams never get an InvestorV1)
  deployments.push({
    contractType: 'Investor',
    initializerData: encodeFunctionData({
      abi: INVESTOR_V2_ABI,
      functionName: 'initialize',
      args: [investorInput.name, investorInput.symbol, zeroAddress]
    })
  })

  // Proposals contract
  deployments.push({
    contractType: 'Proposals',
    initializerData: encodeFunctionData({
      abi: PROPOSALS_ABI,
      functionName: 'initialize',
      args: [currentUserAddress]
    })
  })

  // ExpenseAccountEIP712 contract
  deployments.push({
    contractType: 'ExpenseAccountEIP712',
    initializerData: encodeFunctionData({
      abi: EXPENSE_ACCOUNT_EIP712_ABI,
      functionName: 'initialize',
      args: [currentUserAddress, [USDC_ADDRESS, USDC_E_ADDRESS, USDT_ADDRESS]]
    })
  })

  // CashRemunerationEIP712 contract
  deployments.push({
    contractType: 'CashRemunerationEIP712',
    initializerData: encodeFunctionData({
      abi: CASH_REMUNERATION_EIP712_ABI,
      functionName: 'initialize',
      args: [zeroAddress, [USDC_ADDRESS, USDC_E_ADDRESS]]
    })
  })

  // Elections contract
  deployments.push({
    contractType: 'Elections',
    initializerData: encodeFunctionData({
      abi: ELECTIONS_ABI,
      functionName: 'initialize',
      args: [currentUserAddress]
    })
  })

  // SafeDepositRouter contract
  deployments.push({
    contractType: 'SafeDepositRouter',
    initializerData: encodeFunctionData({
      abi: SAFE_DEPOSIT_ROUTER_ABI,
      functionName: 'initialize',
      args: [
        currentUserAddress, // safeAddress
        [USDC_ADDRESS, USDC_E_ADDRESS, USDT_ADDRESS], // supportedTokens
        parseUnits('1', 6) // multiplier - default 1:1 ratio
      ]
    })
  })

  // Vesting contract — agreement-only; mints the team's share token on release.
  // NOTE: Vesting/CashRemuneration/accounting composables still resolve the
  // share token via getInvestorAddress() — they will not
  // find a v2 team's contract until updated (tracked separately from this
  // deploy-pipeline wiring; see the Investor v2 migration effort, issue #2286).
  deployments.push({
    contractType: 'Vesting',
    initializerData: encodeFunctionData({
      abi: VESTING_ABI,
      functionName: 'initialize',
      args: []
    })
  })

  // FixedReturn contract
  deployments.push({
    contractType: 'FixedReturn',
    initializerData: encodeFunctionData({
      abi: FIXED_RETURN_ABI,
      functionName: 'initialize',
      args: [[USDT_ADDRESS, USDC_ADDRESS, USDC_E_ADDRESS], currentUserAddress]
    })
  })

  return deployments
}
