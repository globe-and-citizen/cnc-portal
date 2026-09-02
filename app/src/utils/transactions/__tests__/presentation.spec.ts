import { describe, expect, it } from 'vitest'
import type { TokenId } from '@/constant'
import { enrichTransactionPresentation, resolveTransactionUser } from '../presentation'

const MEMBER_ADDRESS = '0x1111111111111111111111111111111111111111'
const CONTRACT_ADDRESS = '0x2222222222222222222222222222222222222222'
const TOKEN_ADDRESS = '0xa3492d046095affe351cfac15de9b86425e235db'

describe('transaction presentation', () => {
  const directory = {
    contracts: [{ address: CONTRACT_ADDRESS, type: 'Bank' }],
    members: [{ address: MEMBER_ADDRESS, name: 'Ada' }],
    tokens: [{ address: TOKEN_ADDRESS, id: 'usdc' as TokenId, symbol: 'USDC' }]
  }

  it('resolves contracts, members, tokens, and unknown addresses without store access', () => {
    expect(resolveTransactionUser(CONTRACT_ADDRESS.toUpperCase(), directory)).toMatchObject({
      name: 'Bank',
      icon: 'heroicons:document-text'
    })
    expect(resolveTransactionUser(MEMBER_ADDRESS.toUpperCase(), directory)).toMatchObject({
      name: 'Ada'
    })
    expect(resolveTransactionUser(TOKEN_ADDRESS.toUpperCase(), directory)).toMatchObject({
      name: 'USDC'
    })
    expect(resolveTransactionUser('0xunknown', directory)).toEqual({
      name: 'User',
      address: '0xunknown'
    })
  })

  it('enriches token values from an injected currency context', () => {
    const getTokenPrice = (tokenId: TokenId) => (tokenId === 'usdc' ? 1.25 : 0)

    expect(
      enrichTransactionPresentation(
        { amount: '4', tokenAddress: TOKEN_ADDRESS.toUpperCase(), token: '-' },
        { supportedTokens: directory.tokens, getTokenPrice }
      )
    ).toEqual({
      tokenAddress: TOKEN_ADDRESS,
      token: 'USDC',
      amount: '4',
      amountLocal: 5
    })
  })
})
