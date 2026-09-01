import { describe, expect, it, vi } from 'vitest'

// The global viem mock (`src/tests/setup/viem.setup.ts`) replaces `encodeFunctionData`
// with a fake `'0xEncodedData'` string. This module's whole job is producing real
// calldata bytes, so it needs the genuine implementation.
vi.unmock('viem')

import { encodeFunctionData, size, type Hex } from 'viem'
import { bankAbi } from '@/artifacts/abi/generated'
import { decodeFactureIdFromCalldata, encodeDepositTokenWithFactureId } from '../factureCalldata'

const TOKEN_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
const AMOUNT = 128_000_000n // 128 USDC (6 decimals)

describe('factureCalldata', () => {
  it('round-trips a facture ID through encode and decode', () => {
    const calldata = encodeDepositTokenWithFactureId({
      token: TOKEN_ADDRESS,
      amount: AMOUNT,
      factureId: 'order_8842'
    })

    expect(decodeFactureIdFromCalldata(calldata)).toBe('order_8842')
  })

  it('round-trips an empty facture ID', () => {
    const calldata = encodeDepositTokenWithFactureId({
      token: TOKEN_ADDRESS,
      amount: AMOUNT,
      factureId: ''
    })

    expect(decodeFactureIdFromCalldata(calldata)).toBe('')
  })

  it('round-trips non-ASCII UTF-8 facture IDs', () => {
    const calldata = encodeDepositTokenWithFactureId({
      token: TOKEN_ADDRESS,
      amount: AMOUNT,
      factureId: 'facture_héllo_🧾'
    })

    expect(decodeFactureIdFromCalldata(calldata)).toBe('facture_héllo_🧾')
  })

  it('prefixes the plain depositToken calldata unchanged', () => {
    const baseCalldata = encodeFunctionData({
      abi: bankAbi,
      functionName: 'depositToken',
      args: [TOKEN_ADDRESS, AMOUNT]
    })
    const calldata = encodeDepositTokenWithFactureId({
      token: TOKEN_ADDRESS,
      amount: AMOUNT,
      factureId: 'order_8842'
    })

    expect(calldata.startsWith(baseCalldata)).toBe(true)
    // selector(4) + token(32) + amount(32) + length-prefix(2) + 'order_8842'(10)
    expect(size(calldata)).toBe(size(baseCalldata) + 2 + 10)
  })

  it('rejects a facture ID beyond the 65535-byte length prefix', () => {
    const tooLong = 'x'.repeat(0xffff + 1)

    expect(() =>
      encodeDepositTokenWithFactureId({ token: TOKEN_ADDRESS, amount: AMOUNT, factureId: tooLong })
    ).toThrow(/too long/)
  })

  it('returns undefined for a plain depositToken call with no appended facture ID', () => {
    const baseCalldata = encodeFunctionData({
      abi: bankAbi,
      functionName: 'depositToken',
      args: [TOKEN_ADDRESS, AMOUNT]
    })

    expect(decodeFactureIdFromCalldata(baseCalldata)).toBeUndefined()
  })

  it('returns undefined for calldata with a length prefix that overruns the buffer', () => {
    const baseCalldata = encodeFunctionData({
      abi: bankAbi,
      functionName: 'depositToken',
      args: [TOKEN_ADDRESS, AMOUNT]
    })
    // Length prefix claims 100 bytes follow, but none do.
    const malformed = (baseCalldata + '0064') as Hex

    expect(decodeFactureIdFromCalldata(malformed)).toBeUndefined()
  })

  it('returns undefined for unrelated short calldata', () => {
    expect(decodeFactureIdFromCalldata('0x1234')).toBeUndefined()
  })
})
