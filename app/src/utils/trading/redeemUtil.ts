import { encodeFunctionData, getAddress } from 'viem'
import {
  NEG_RISK_ADAPTER_ADDRESS,
  USDC_E_CONTRACT_ADDRESS,
  CTF_CONTRACT_ADDRESS
} from '@/constant/tokens'
import { OperationType, type SafeTransactionDataPartial } from '@safe-global/types-kit'

const ctfAbi = [
  {
    inputs: [
      { name: 'collateralToken', type: 'address' },
      { name: 'parentCollectionId', type: 'bytes32' },
      { name: 'conditionId', type: 'bytes32' },
      { name: 'indexSets', type: 'uint256[]' }
    ],
    name: 'redeemPositions',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  }
] as const

export interface RedeemParams {
  conditionId: string
  outcomeIndex: number
}

export const createRedeemTx = (params: RedeemParams): SafeTransactionDataPartial => {
  const { conditionId, outcomeIndex } = params

  // For simple binary outcomes, parentCollectionId is empty
  const parentCollectionId = '0x' + '0'.repeat(64)

  // indexSets array for the specific outcome
  const indexSet = BigInt(1 << outcomeIndex)

  console.log('args: ', [
    USDC_E_CONTRACT_ADDRESS as `0x${string}`,
    parentCollectionId as `0x${string}`,
    conditionId as `0x${string}`,
    [indexSet]
  ])

  const data = encodeFunctionData({
    abi: ctfAbi,
    functionName: 'redeemPositions',
    args: [
      USDC_E_CONTRACT_ADDRESS as `0x${string}`,
      parentCollectionId as `0x${string}`,
      conditionId as `0x${string}`,
      [indexSet]
    ]
  })

  return {
    to: getAddress(CTF_CONTRACT_ADDRESS),
    operation: OperationType.Call,
    data,
    value: '0'
  }
}

const negRiskAdapterAbi = [
  {
    inputs: [
      { name: '_conditionId', type: 'bytes32' },
      { name: '_amounts', type: 'uint256[]' }
    ],
    name: 'redeemPositions',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  }
] as const

export interface RedeemParamsNegRisk {
  conditionId: string
  // For NegRisk, you must specify the exact amount of shares to burn
  // Usually [amountOfYes, amountOfNo]
  amounts: [bigint, bigint]
}

export const createRedeemTxNegRisk = (params: RedeemParamsNegRisk): SafeTransactionDataPartial => {
  const { conditionId, amounts } = params

  const data = encodeFunctionData({
    abi: negRiskAdapterAbi,
    functionName: 'redeemPositions',
    args: [
      conditionId as `0x${string}`,
      amounts // Array of [yesAmount, noAmount]
    ]
  })

  return {
    to: getAddress(NEG_RISK_ADAPTER_ADDRESS),
    operation: OperationType.Call,
    data,
    value: '0'
  }
}
