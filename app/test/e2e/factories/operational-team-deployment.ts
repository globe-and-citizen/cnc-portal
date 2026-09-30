import {
  encodeFunctionData,
  isAddress,
  parseEventLogs,
  parseUnits,
  zeroAddress,
  type Address,
  type Hex
} from 'viem'
import type { ContractType } from '../../../src/types/teamContract'
import {
  bankAbi,
  cashRemunerationEip712Abi,
  electionsAbi,
  expenseAccountEip712Abi,
  factoryBeaconAbi,
  fixedReturnAbi,
  investorAbi,
  officerAbi,
  proposalsAbi,
  safeDepositRouterAbi,
  vestingAbi
} from '../../../src/artifacts/abi/generated.ts'
import { E2E_OWNER, publicClient, walletClient } from '../e2e-chain'

export interface DeploymentAddressManifest {
  [key: string]: string | undefined
}

export interface DeployedOfficer {
  address: Address
  deployBlockNumber: number
  deployedAt: string
}

interface BeaconConfig {
  beaconType: string
  beaconAddress: Address
}

interface DeploymentConfig {
  contractType: ContractType
  initializerData: Hex
}

const BEACON_PROXY_CREATED_EVENT = [
  {
    type: 'event',
    name: 'BeaconProxyCreated',
    inputs: [
      { type: 'address', name: 'proxy', indexed: true },
      { type: 'address', name: 'deployer', indexed: true }
    ]
  }
] as const

export function requiredAddress(manifest: DeploymentAddressManifest, key: string): Address {
  const value = manifest[key]
  if (!value || !isAddress(value)) {
    throw new Error(`The integrated deployment manifest is missing a valid ${key} address`)
  }
  return value
}

function optionalAddress(manifest: DeploymentAddressManifest, key: string): Address | null {
  const value = manifest[key]
  if (value === undefined) return null
  if (!isAddress(value)) {
    throw new Error(`The integrated deployment manifest contains an invalid ${key} address`)
  }
  return value
}

export async function assertAddressHasCode(address: Address, label: string): Promise<void> {
  const code = await publicClient.getCode({ address })
  if (!code || code === '0x') {
    throw new Error(`The integrated deployment is missing ${label}`)
  }
}

export function buildBeaconConfigs(manifest: DeploymentAddressManifest): BeaconConfig[] {
  const configs: BeaconConfig[] = [
    { beaconType: 'Bank', beaconAddress: requiredAddress(manifest, 'BankBeaconModule#Beacon') },
    {
      beaconType: 'BoardOfDirectors',
      beaconAddress: requiredAddress(manifest, 'BoardOfDirectorsModule#Beacon')
    },
    {
      beaconType: 'Proposals',
      beaconAddress: requiredAddress(manifest, 'ProposalBeaconModule#Beacon')
    },
    {
      beaconType: 'ExpenseAccountEIP712',
      beaconAddress: requiredAddress(manifest, 'ExpenseAccountEIP712Module#FactoryBeacon')
    },
    {
      beaconType: 'CashRemunerationEIP712',
      beaconAddress: requiredAddress(manifest, 'CashRemunerationEIP712Module#FactoryBeacon')
    },
    {
      beaconType: 'Investor',
      beaconAddress: requiredAddress(manifest, 'InvestorBeaconModule#Beacon')
    },
    {
      beaconType: 'Elections',
      beaconAddress: requiredAddress(manifest, 'ElectionsBeaconModule#Beacon')
    },
    {
      beaconType: 'SafeDepositRouter',
      beaconAddress: requiredAddress(manifest, 'SafeDepositRouterBeaconModule#Beacon')
    }
  ]

  const vestingBeacon = optionalAddress(manifest, 'VestingBeaconModule#Beacon')
  if (vestingBeacon) configs.push({ beaconType: 'Vesting', beaconAddress: vestingBeacon })

  const fixedReturnBeacon = optionalAddress(manifest, 'FixedReturnBeaconModule#Beacon')
  if (fixedReturnBeacon) {
    configs.push({ beaconType: 'FixedReturn', beaconAddress: fixedReturnBeacon })
  }

  return configs
}

export function buildDeploymentConfigs(
  currentUserAddress: Address,
  investorInput: { name: string; symbol: string },
  manifest: DeploymentAddressManifest
): DeploymentConfig[] {
  const usdc = requiredAddress(manifest, 'MockTokens#USDC')
  const usdcE = requiredAddress(manifest, 'MockTokens#USDCe')
  const usdt = requiredAddress(manifest, 'MockTokens#USDT')
  const deployments: DeploymentConfig[] = [
    {
      contractType: 'Bank',
      initializerData: encodeFunctionData({
        abi: bankAbi,
        functionName: 'initialize',
        args: [[usdt, usdc, usdcE], currentUserAddress]
      })
    },
    {
      contractType: 'Investor',
      initializerData: encodeFunctionData({
        abi: investorAbi,
        functionName: 'initialize',
        args: [investorInput.name, investorInput.symbol, zeroAddress]
      })
    },
    {
      contractType: 'Proposals',
      initializerData: encodeFunctionData({
        abi: proposalsAbi,
        functionName: 'initialize',
        args: [currentUserAddress]
      })
    },
    {
      contractType: 'ExpenseAccountEIP712',
      initializerData: encodeFunctionData({
        abi: expenseAccountEip712Abi,
        functionName: 'initialize',
        args: [currentUserAddress, [usdc, usdcE, usdt]]
      })
    },
    {
      contractType: 'CashRemunerationEIP712',
      initializerData: encodeFunctionData({
        abi: cashRemunerationEip712Abi,
        functionName: 'initialize',
        args: [zeroAddress, [usdc, usdcE]]
      })
    },
    {
      contractType: 'Elections',
      initializerData: encodeFunctionData({
        abi: electionsAbi,
        functionName: 'initialize',
        args: [currentUserAddress]
      })
    },
    {
      contractType: 'SafeDepositRouter',
      initializerData: encodeFunctionData({
        abi: safeDepositRouterAbi,
        functionName: 'initialize',
        args: [currentUserAddress, [usdc, usdcE, usdt], parseUnits('1', 6)]
      })
    }
  ]

  if (optionalAddress(manifest, 'VestingBeaconModule#Beacon')) {
    deployments.push({
      contractType: 'Vesting',
      initializerData: encodeFunctionData({
        abi: vestingAbi,
        functionName: 'initialize',
        args: []
      })
    })
  }

  if (optionalAddress(manifest, 'FixedReturnBeaconModule#Beacon')) {
    deployments.push({
      contractType: 'FixedReturn',
      initializerData: encodeFunctionData({
        abi: fixedReturnAbi,
        functionName: 'initialize',
        args: [[usdt, usdc, usdcE], currentUserAddress]
      })
    })
  }

  return deployments
}

export async function deployOfficer(
  manifest: DeploymentAddressManifest,
  investorInput: { name: string; symbol: string }
): Promise<DeployedOfficer> {
  const officerFactory = requiredAddress(manifest, 'Officer#FactoryBeacon')
  const beaconConfigs = buildBeaconConfigs(manifest)
  const deployments = buildDeploymentConfigs(E2E_OWNER, investorInput, manifest)
  const initializationData = encodeFunctionData({
    abi: officerAbi,
    functionName: 'initialize',
    args: [E2E_OWNER, beaconConfigs, deployments, true]
  })

  const hash = await walletClient.writeContract({
    address: officerFactory,
    abi: factoryBeaconAbi,
    functionName: 'createBeaconProxy',
    args: [initializationData]
  })
  const receipt = await publicClient.waitForTransactionReceipt({ hash })
  if (receipt.status !== 'success') throw new Error('The E2E Officer deployment transaction failed')

  const [event] = parseEventLogs({
    abi: BEACON_PROXY_CREATED_EVENT,
    eventName: 'BeaconProxyCreated',
    logs: receipt.logs
  })
  if (!event) throw new Error('The Officer deployment receipt has no BeaconProxyCreated event')
  await assertAddressHasCode(event.args.proxy, 'the newly deployed Officer')

  return {
    address: event.args.proxy,
    deployBlockNumber: Number(receipt.blockNumber),
    deployedAt: new Date().toISOString()
  }
}
