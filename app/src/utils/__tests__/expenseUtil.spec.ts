import { describe, it, expect, beforeEach } from 'vitest'
import { getCurrentUserExpenses, getTokens } from '../expenseUtil'
import type { ExpenseResponse, TokenBalance } from '@/types'
import type { TokenId } from '@/constant'
import { zeroAddress } from 'viem'

describe('expenseUtil', () => {
  describe('getCurrentUserExpenses', () => {
    const mockExpenses: ExpenseResponse[] = [
      {
        id: '1',
        signature: 'sig1',
        data: {
          approvedAddress: '0xUser1',
          amount: 100,
          tokenAddress: '0xToken1',
          description: 'Expense 1'
        }
      } as ExpenseResponse,
      {
        id: '2',
        signature: 'sig2',
        data: {
          approvedAddress: '0xUser2',
          amount: 200,
          tokenAddress: '0xToken2',
          description: 'Expense 2'
        }
      } as ExpenseResponse,
      {
        id: '3',
        signature: 'sig3',
        data: {
          approvedAddress: '0xUser1',
          amount: 300,
          tokenAddress: '0xToken3',
          description: 'Expense 3'
        }
      } as ExpenseResponse
    ]

    it('should return expenses for the specified user', () => {
      const userExpenses = getCurrentUserExpenses(mockExpenses, '0xUser1')

      expect(userExpenses).toHaveLength(2)
      expect(userExpenses[0].data.approvedAddress).toBe('0xUser1')
      expect(userExpenses[1].data.approvedAddress).toBe('0xUser1')
      expect(userExpenses[0].id).toBe('1')
      expect(userExpenses[1].id).toBe('3')
    })

    it('should return empty array when no expenses match user', () => {
      const userExpenses = getCurrentUserExpenses(mockExpenses, '0xUser3')

      expect(userExpenses).toEqual([])
    })

    it('should return empty array when expenses is empty', () => {
      const userExpenses = getCurrentUserExpenses([], '0xUser1')

      expect(userExpenses).toEqual([])
    })

    it('should return empty array when expenses is null or undefined', () => {
      expect(getCurrentUserExpenses(null as unknown as Expense[], '0xUser1')).toEqual([])
      expect(getCurrentUserExpenses(undefined as unknown as Expense[], '0xUser1')).toEqual([])
    })

    it('should return empty array when userAddress is empty', () => {
      const userExpenses = getCurrentUserExpenses(mockExpenses, '')

      expect(userExpenses).toEqual([])
    })

    it('should return empty array when userAddress is null or undefined', () => {
      expect(getCurrentUserExpenses(mockExpenses, null as unknown as string)).toEqual([])
      expect(getCurrentUserExpenses(mockExpenses, undefined as unknown as string)).toEqual([])
    })

    it('should handle case-sensitive address matching', () => {
      const userExpenses = getCurrentUserExpenses(mockExpenses, '0xuser1')

      expect(userExpenses).toEqual([])
    })

    it('should return empty array when expenses is not an array', () => {
      expect(getCurrentUserExpenses({} as unknown as Expense[], '0xUser1')).toEqual([])
      expect(getCurrentUserExpenses('not-array' as unknown as Expense[], '0xUser1')).toEqual([])
    })
  })

  describe('getTokens', () => {
    const mockExpenses: ExpenseResponse[] = [
      {
        signature: 'sig1',
        data: {
          tokenAddress: zeroAddress,
          amount: 100
        }
      } as ExpenseResponse,
      {
        signature: 'sig2',
        data: {
          tokenAddress: '0xUSDCAddress',
          amount: 200
        }
      } as ExpenseResponse
    ]

    const mockBalances: TokenBalance[] = [
      {
        token: { id: 'native' as TokenId },
        amount: '1000000000000000000' // 1 ETH in wei
      } as TokenBalance,
      {
        token: { id: 'usdc' as TokenId },
        amount: '1000000' // 1 USDC (6 decimals)
      } as TokenBalance
    ]

    beforeEach(() => {
      // Mock the tokenSymbol function from constantUtil
      const { vi } = await import('vitest')
      vi.mock('../constantUtil', () => ({
        tokenSymbol: vi.fn((address: string) => {
          if (address === zeroAddress) return 'ETH'
          if (address === '0xUSDCAddress') return 'USDC'
          return null
        })
      }))
    })

    it('should return native token info for zero address', () => {
      const tokens = getTokens(mockExpenses, 'sig1', mockBalances)

      expect(tokens).toHaveLength(1)
      expect(tokens[0]).toEqual({
        symbol: 'ETH',
        balance: 1000000000000000000,
        tokenId: zeroAddress
      })
    })

    it('should return USDC token info for USDC address', () => {
      const tokens = getTokens(mockExpenses, 'sig2', mockBalances)

      expect(tokens).toHaveLength(1)
      expect(tokens[0]).toEqual({
        symbol: 'USDC',
        balance: 1000000,
        tokenId: '0xUSDCAddress'
      })
    })

    it('should return empty array when signature not found', () => {
      const tokens = getTokens(mockExpenses, 'unknown-sig', mockBalances)

      expect(tokens).toEqual([])
    })

    it('should return empty array when token symbol is null', () => {
      const expensesWithUnknownToken: ExpenseResponse[] = [
        {
          signature: 'sig-unknown',
          data: {
            tokenAddress: '0xUnknownToken',
            amount: 100
          }
        } as ExpenseResponse
      ]

      const tokens = getTokens(expensesWithUnknownToken, 'sig-unknown', mockBalances)

      expect(tokens).toEqual([])
    })

    it('should return empty array when balance is NaN', () => {
      const balancesWithNaN: TokenBalance[] = [
        {
          token: { id: 'native' as TokenId },
          amount: 'not-a-number'
        } as TokenBalance
      ]

      const tokens = getTokens(mockExpenses, 'sig1', balancesWithNaN)

      expect(tokens).toEqual([])
    })

    it('should return empty array when balance is not found', () => {
      const emptyBalances: TokenBalance[] = []

      const tokens = getTokens(mockExpenses, 'sig1', emptyBalances)

      expect(tokens).toEqual([])
    })

    it('should handle empty expenses array', () => {
      const tokens = getTokens([], 'sig1', mockBalances)

      expect(tokens).toEqual([])
    })

    it('should handle missing tokenAddress in expense data', () => {
      const expensesWithoutToken: ExpenseResponse[] = [
        {
          signature: 'sig-no-token',
          data: {
            amount: 100
          }
        } as ExpenseResponse
      ]

      const tokens = getTokens(expensesWithoutToken, 'sig-no-token', mockBalances)

      expect(tokens).toEqual([])
    })
  })
})
