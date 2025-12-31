import { createPublicClient, http, encodeFunctionData, erc20Abi } from 'viem'
import { OperationType, type SafeTransaction } from '@polymarket/builder-relayer-client'
import { polygon } from 'viem/chains'
import {
  USDC_E_CONTRACT_ADDRESS,
  CTF_CONTRACT_ADDRESS,
  CTF_EXCHANGE_ADDRESS,
  NEG_RISK_CTF_EXCHANGE_ADDRESS,
  NEG_RISK_ADAPTER_ADDRESS
} from '@/constant/tokens'
import { POLYGON_RPC_URL } from '@/constant'
import { POLYMARKET_SAFE_ABI as gnosisSafeAbi } from '@/artifacts/abi/polymarket-safe'

// types/approvals.ts
export interface SafeOwnerCheck {
  hasRequiredOwners: boolean
  owners: string[]
  threshold: number
  missingOwners: string[]
  hasRequiredThreshold: boolean
}

export interface ApprovalCheckResult {
  allApproved: boolean
  usdcApprovals: Record<string, boolean>
  outcomeTokenApprovals: Record<string, boolean>
  safeOwners: SafeOwnerCheck
  isSetupComplete: boolean
}

const MAX_UINT256 = '115792089237316195423570985008687907853269984665640564039457584007913129639935'

const erc1155Abi = [
  {
    inputs: [
      { name: 'operator', type: 'address' },
      { name: 'approved', type: 'bool' }
    ],
    name: 'setApprovalForAll',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { name: 'account', type: 'address' },
      { name: 'operator', type: 'address' }
    ],
    name: 'isApprovedForAll',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function'
  }
] as const

const publicClient = createPublicClient({
  chain: polygon,
  transport: http(POLYGON_RPC_URL)
})

const USDC_E_SPENDERS = [
  { address: CTF_CONTRACT_ADDRESS, name: 'CTF Contract' },
  { address: NEG_RISK_ADAPTER_ADDRESS, name: 'Neg Risk Adapter' },
  { address: CTF_EXCHANGE_ADDRESS, name: 'CTF Exchange' },
  { address: NEG_RISK_CTF_EXCHANGE_ADDRESS, name: 'Neg Risk CTF Exchange' }
] as const

const OUTCOME_TOKEN_SPENDERS = [
  { address: CTF_EXCHANGE_ADDRESS, name: 'CTF Exchange' },
  { address: NEG_RISK_CTF_EXCHANGE_ADDRESS, name: 'Neg Risk Exchange' },
  { address: NEG_RISK_ADAPTER_ADDRESS, name: 'Neg Risk Adapter' }
] as const

// Define the required system owners (update these with your actual addresses)
const REQUIRED_SYSTEM_OWNERS = [
  '0xE8e54df081dE1012f6Ea0bBa4EE2397A56f22Ec9', // Treasury Signer
  '0x5c4B88fC73AB48CAA4b7a4BAE3f715c347f22D95' // Council Member 1
]

const REQUIRED_THRESHOLD = 2

const checkUSDCApprovalForSpender = async (
  safeAddress: string,
  spender: string
): Promise<boolean> => {
  try {
    const allowance = await publicClient.readContract({
      address: USDC_E_CONTRACT_ADDRESS as `0x${string}`,
      abi: erc20Abi,
      functionName: 'allowance',
      args: [safeAddress as `0x${string}`, spender as `0x${string}`]
    })

    const threshold = BigInt('1000000000000')
    return allowance >= threshold
  } catch (error) {
    console.warn(`Failed to check USDC approval for ${spender}:`, error)
    return false
  }
}

const checkERC1155ApprovalForSpender = async (
  safeAddress: string,
  spender: string
): Promise<boolean> => {
  try {
    const isApproved = await publicClient.readContract({
      address: CTF_CONTRACT_ADDRESS as `0x${string}`,
      abi: erc1155Abi,
      functionName: 'isApprovedForAll',
      args: [safeAddress as `0x${string}`, spender as `0x${string}`]
    })

    return isApproved
  } catch (error) {
    console.warn(`Failed to check ERC1155 approval for ${spender}:`, error)
    return false
  }
}

const checkSafeOwners = async (
  safeAddress: string
): Promise<{
  hasRequiredOwners: boolean
  owners: string[]
  threshold: number
  missingOwners: string[]
  hasRequiredThreshold: boolean
}> => {
  try {
    // Get current owners
    const owners = (await publicClient.readContract({
      address: safeAddress as `0x${string}`,
      abi: gnosisSafeAbi,
      functionName: 'getOwners'
    })) as `0x${string}`[]

    // Get current threshold
    const threshold = (await publicClient.readContract({
      address: safeAddress as `0x${string}`,
      abi: gnosisSafeAbi,
      functionName: 'getThreshold'
    })) as bigint

    // Check if all required system owners are present
    const missingOwners = REQUIRED_SYSTEM_OWNERS.filter(
      (requiredOwner) => !owners.includes(requiredOwner as `0x${string}`)
    )

    const hasRequiredOwners = missingOwners.length === 0
    const hasRequiredThreshold = Number(threshold) === REQUIRED_THRESHOLD

    return {
      hasRequiredOwners,
      owners: owners as string[],
      threshold: Number(threshold),
      missingOwners,
      hasRequiredThreshold
    }
  } catch (error) {
    console.warn(`Failed to check safe owners for ${safeAddress}:`, error)
    return {
      hasRequiredOwners: false,
      owners: [],
      threshold: 0,
      missingOwners: REQUIRED_SYSTEM_OWNERS,
      hasRequiredThreshold: false
    }
  }
}

export const checkAllApprovals = async (
  safeAddress: string
): Promise<{
  allApproved: boolean
  usdcApprovals: Record<string, boolean>
  outcomeTokenApprovals: Record<string, boolean>
  safeOwners: {
    hasRequiredOwners: boolean
    owners: string[]
    threshold: number
    missingOwners: string[]
    hasRequiredThreshold: boolean
  }
  isSetupComplete: boolean
}> => {
  const usdcApprovals: Record<string, boolean> = {}
  const outcomeTokenApprovals: Record<string, boolean> = {}

  // Check token approvals in parallel
  const [usdcResults, outcomeTokenResults, safeOwnerResults] = await Promise.all([
    Promise.all(
      USDC_E_SPENDERS.map(async ({ address, name }) => {
        const approved = await checkUSDCApprovalForSpender(safeAddress, address)
        usdcApprovals[name] = approved
        return { name, approved }
      })
    ),
    Promise.all(
      OUTCOME_TOKEN_SPENDERS.map(async ({ address, name }) => {
        const approved = await checkERC1155ApprovalForSpender(safeAddress, address)
        outcomeTokenApprovals[name] = approved
        return { name, approved }
      })
    ),
    checkSafeOwners(safeAddress)
  ])

  const allTokenApproved =
    Object.values(usdcApprovals).every((approved) => approved) &&
    Object.values(outcomeTokenApprovals).every((approved) => approved)

  const allSafeOwnersConfigured =
    safeOwnerResults.hasRequiredOwners && safeOwnerResults.hasRequiredThreshold

  const isSetupComplete = allTokenApproved && allSafeOwnersConfigured

  return {
    allApproved: allTokenApproved,
    usdcApprovals,
    outcomeTokenApprovals,
    safeOwners: safeOwnerResults,
    isSetupComplete
  }
}

export const createAllApprovalTxs = (): SafeTransaction[] => {
  const safeTxns: SafeTransaction[] = []

  // Add USDC approval transactions
  for (const { address } of USDC_E_SPENDERS) {
    safeTxns.push({
      to: USDC_E_CONTRACT_ADDRESS,
      operation: OperationType.Call,
      data: encodeFunctionData({
        abi: erc20Abi,
        functionName: 'approve',
        args: [address as `0x${string}`, BigInt(MAX_UINT256)]
      }),
      value: '0'
    })
  }

  // Add outcome token approval transactions
  for (const { address } of OUTCOME_TOKEN_SPENDERS) {
    safeTxns.push({
      to: CTF_CONTRACT_ADDRESS,
      operation: OperationType.Call,
      data: encodeFunctionData({
        abi: erc1155Abi,
        functionName: 'setApprovalForAll',
        args: [address as `0x${string}`, true]
      }),
      value: '0'
    })
  }

  return safeTxns
}

export const createAddOwnerTransactions = (
  safeAddress: string,
  ownersToAdd: string[]
): SafeTransaction[] => {
  const safeTxns: SafeTransaction[] = []

  // Add transactions to add each missing owner
  for (const owner of ownersToAdd) {
    safeTxns.push({
      to: safeAddress,
      operation: OperationType.Call,
      data: encodeFunctionData({
        abi: gnosisSafeAbi,
        functionName: 'addOwnerWithThreshold',
        args: [owner as `0x${string}`, BigInt(REQUIRED_THRESHOLD)]
      }),
      value: '0'
    })
  }

  // If we need to change threshold, add that transaction too
  // Note: This would require checking current threshold first
  safeTxns.push({
    to: safeAddress,
    operation: OperationType.Call,
    data: encodeFunctionData({
      abi: gnosisSafeAbi,
      functionName: 'changeThreshold',
      args: [BigInt(REQUIRED_THRESHOLD)]
    }),
    value: '0'
  })

  return safeTxns
}

export const createCompleteSetupTransactions = (safeAddress: string): SafeTransaction[] => {
  const safeTxns: SafeTransaction[] = []

  // Add all approval transactions
  const approvalTxs = createAllApprovalTxs()
  safeTxns.push(...approvalTxs)

  // Add system owners
  const SYSTEM_OWNERS = REQUIRED_SYSTEM_OWNERS.slice(0, 2) // Add first 2
  for (const owner of SYSTEM_OWNERS) {
    safeTxns.push({
      to: safeAddress,
      operation: OperationType.Call,
      data: encodeFunctionData({
        abi: gnosisSafeAbi,
        functionName: 'addOwnerWithThreshold',
        args: [owner as `0x${string}`, BigInt(REQUIRED_THRESHOLD)]
      }),
      value: '0'
    })
  }

  // Ensure threshold is set correctly
  safeTxns.push({
    to: safeAddress,
    operation: OperationType.Call,
    data: encodeFunctionData({
      abi: gnosisSafeAbi,
      functionName: 'changeThreshold',
      args: [BigInt(REQUIRED_THRESHOLD)]
    }),
    value: '0'
  })

  return safeTxns
}
