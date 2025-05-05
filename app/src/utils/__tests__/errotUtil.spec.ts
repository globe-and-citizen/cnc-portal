import { describe, it, expect } from 'vitest'
import { parseError } from '@/utils/errorUtil'
import expenseAbi from '@/artifacts/abi/expense-account-eip712.json'
import type { EstimateContractGasErrorType, Abi } from 'viem'

const mockAbi: Abi = [
  {
    type: 'error',
    name: 'InsufficientBalance',
    inputs: [
      { name: 'available', type: 'uint256' },
      { name: 'required', type: 'uint256' }
    ]
  }
]

describe('parseError', () => {
  it('should handle standard Error objects', () => {
    const error = new Error('Something went wrong')
    expect(parseError(error)).toBe('Something went wrong')
  })

  it('should handle non-Error objects', () => {
    expect(parseError('oops')).toBe('App Error: Looks like something went wrong.')
    expect(parseError(42)).toBe('App Error: Looks like something went wrong.')
    expect(parseError(null)).toBe('App Error: Looks like something went wrong.')
  })

  it('should parse MetaMask errors', () => {
    const metamaskError = new Error('MetaMask error')
    //@ts-expect-error: mimic MetaMask error structure
    metamaskError.info = {
      error: { code: 4001, message: 'Error: User denied transaction' },
      payload: {
        method: 'eth_sendTransaction',
        params: ['0x123'],
        jsonrpc: '2.0'
      }
    }

    expect(parseError(metamaskError)).toBe('Metamask Error: User denied transaction')
  })

  it('should parse contract revert messages', () => {
    const contractError = new Error('Some error') as EstimateContractGasErrorType
    contractError.shortMessage = 'Error: revert: Not enough funds'

    expect(parseError(contractError, mockAbi)).toBe('Not enough funds')
  })

  it('should parse custom contract errors', () => {
    const contractError = new Error('Some error') as EstimateContractGasErrorType
    contractError.shortMessage =
      'Execution reverted with reason: custom error 0x20435cc1: 0000000000000000000000000000000000000000000000000000000005f5e100.'

    expect(parseError(contractError, expenseAbi as Abi)).toBe(
      'AmountPerPeriodExceeded: Contract reverted'
    )
  })

  it('should handle unknown contract errors', () => {
    const contractError = new Error('Some error') as EstimateContractGasErrorType
    contractError.shortMessage = 'Error: some unknown error format'

    expect(parseError(contractError, mockAbi)).toBe('Error: some unknown error format')
  })
})

// describe('isMetaMaskErrorInfo', () => {
//   it('should validate correct MetaMask error info', () => {
//     const validInfo: MetaMaskErrorInfo = {
//       error: { code: 4001, message: 'User denied' },
//       payload: {
//         method: 'eth_sendTransaction',
//         params: ['0x123'],
//         jsonrpc: '2.0'
//       }
//     }

//     expect(isMetaMaskErrorInfo(validInfo)).toBe(true)
//   })

//   it('should reject invalid MetaMask error info', () => {
//     expect(isMetaMaskErrorInfo(null)).toBe(false)
//     expect(isMetaMaskErrorInfo(undefined)).toBe(false)
//     expect(isMetaMaskErrorInfo({})).toBe(false)
//     expect(isMetaMaskErrorInfo({ error: {} })).toBe(false)
//     expect(isMetaMaskErrorInfo({
//       error: { code: '4001', message: 123 }, // wrong types
//       payload: {}
//     })).toBe(false)
//   })
// })

// describe('parseErrorInfo', () => {
//   it('should extract the message part from MetaMask error', () => {
//     const info: MetaMaskErrorInfo = {
//       error: { code: 4001, message: 'Error: Transaction rejected' },
//       payload: {
//         method: 'eth_sendTransaction',
//         params: ['0x123'],
//         jsonrpc: '2.0'
//       }
//     }

//     expect(parseErrorInfo(info)).toBe('Transaction rejected')
//   })

//   it('should handle messages without colon separator', () => {
//     const info: MetaMaskErrorInfo = {
//       error: { code: 4001, message: 'Transaction rejected' },
//       payload: {
//         method: 'eth_sendTransaction',
//         params: ['0x123'],
//         jsonrpc: '2.0'
//       }
//     }

//     expect(parseErrorInfo(info)).toBe('Transaction rejected')
//   })
// })

// describe('parseRevertReason', () => {
//   it('should parse custom error format', () => {
//     const errorString = 'Error: custom error InsufficientBalance(100, 200)'
//     const result = parseRevertReason(errorString)
//     expect(result).toMatch(/^0x/)
//   })

//   it('should parse revert message format', () => {
//     const errorString = 'Error: revert: Not enough funds'
//     expect(parseRevertReason(errorString)).toBe('Not enough funds')
//   })

//   it('should return original string for unknown formats', () => {
//     const errorString = 'Some unknown error format'
//     expect(parseRevertReason(errorString)).toBe(errorString)
//   })
// })

// describe('safeParse', () => {
//   it('should handle hex custom errors', () => {
//     const errorString = 'Error: custom error InsufficientBalance(100, 200)'
//     const result = parseError(new Error(errorString), mockAbi)
//     expect(result).toBe('InsufficientBalance: Contract reverted')
//   })

//   it('should handle string revert messages', () => {
//     const errorString = 'Error: revert: Not enough funds'
//     const result = parseError(new Error(errorString), mockAbi)
//     expect(result).toBe('Not enough funds')
//   })

//   it('should return default for invalid formats', () => {
//     const errorString = 'Some unknown error format'
//     const result = parseError(new Error(errorString), mockAbi)
//     expect(result).toBe('Contract reverted')
//   })
// })
