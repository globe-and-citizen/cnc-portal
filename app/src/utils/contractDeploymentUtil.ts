import type { Address } from 'viem'
import { encodeFunctionData, zeroAddress } from 'viem'
import {
  BANK_BEACON_ADDRESS,
  BOD_BEACON_ADDRESS,
  CASH_REMUNERATION_EIP712_BEACON_ADDRESS,
  EXPENSE_ACCOUNT_EIP712_BEACON_ADDRESS,
  INVESTOR_V1_BEACON_ADDRESS,
  PROPOSALS_BEACON_ADDRESS,
  ELECTIONS_BEACON_ADDRESS,
  SAFE_DEPOSIT_ROUTER_BEACON_ADDRESS,
  USDC_ADDRESS,
  USDT_ADDRESS,
  USDC_E_ADDRESS
} from '@/constant'
import { BANK_ABI } from '@/artifacts/abi/bank'
import { EXPENSE_ACCOUNT_EIP712_ABI } from '@/artifacts/abi/expense-account-eip712'
import { CASH_REMUNERATION_EIP712_ABI } from '@/artifacts/abi/cash-remuneration-eip712'
import { ELECTIONS_ABI } from '@/artifacts/abi/elections'
import { INVESTOR_ABI } from '@/artifacts/abi/investorsV1'
import { SAFE_DEPOSIT_ROUTER_ABI } from '@/artifacts/abi/safe-deposit-router'
import { PROPOSALS_ABI } from '@/artifacts/abi/proposals'
import { log } from '@/utils'

/**
 * Beacon configuration type
 */
export interface BeaconConfig {
  beaconType: string
  beaconAddress: Address
}

/**
 * Deployment configuration type
 */
export interface DeploymentConfig {
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
    { name: 'INVESTOR_V1_BEACON_ADDRESS', value: INVESTOR_V1_BEACON_ADDRESS },
    { name: 'ELECTIONS_BEACON_ADDRESS', value: ELECTIONS_BEACON_ADDRESS },
    {
      name: 'SAFE_DEPOSIT_ROUTER_BEACON_ADDRESS',
      value: SAFE_DEPOSIT_ROUTER_BEACON_ADDRESS
    }
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
      beaconType: 'InvestorV1',
      beaconAddress: INVESTOR_V1_BEACON_ADDRESS!
    },
    {
      beaconType: 'Elections',
      beaconAddress: ELECTIONS_BEACON_ADDRESS!
    },
    {
      beaconType: 'SafeDepositRouter',
      beaconAddress: SAFE_DEPOSIT_ROUTER_BEACON_ADDRESS!
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

  // InvestorV1 contract
  deployments.push({
    contractType: 'InvestorV1',
    initializerData: encodeFunctionData({
      abi: INVESTOR_ABI,
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
      args: [currentUserAddress, USDT_ADDRESS, USDC_ADDRESS]
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
        zeroAddress, // investorAddress
        [USDC_ADDRESS, USDC_E_ADDRESS, USDT_ADDRESS], // supportedTokens
        1n // multiplier - default 1:1 ratio
      ]
    })
  })

  return deployments
}

/**
 * Handles the BeaconProxyCreated event logs
 * @param logs - Event logs from the contract
 * @param expectedHash - Expected transaction hash
 * @param currentUserAddress - Current user's wallet address
 * @returns The proxy address if validation succeeds, null otherwise
 */
export const handleBeaconProxyCreatedLogs = (
  logs: unknown[],
  expectedHash: `0x${string}` | undefined,
  currentUserAddress: Address
): Address | null => {
  if (!logs.length) {
    log.error('No logs found')
    return null
  }

  interface BeaconProxyLog {
    args: {
      deployer: Address
      proxy: Address
    }
    transactionHash: `0x${string}`
  }

  const firstLog = logs[0] as BeaconProxyLog

  if (!firstLog || firstLog.transactionHash !== expectedHash) {
    log.error('Transaction hash does not match')
    return null
  }

  const { deployer, proxy: proxyAddress } = firstLog.args

  if (currentUserAddress !== deployer) {
    log.error('Deployer address does not match with the current user address')
    return null
  }

  return proxyAddress
}
