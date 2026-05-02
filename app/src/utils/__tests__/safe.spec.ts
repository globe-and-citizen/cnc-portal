import { describe, it, expect, vi, afterEach } from 'vitest'
import { zeroAddress } from 'viem'
import { NETWORK, USDC_ADDRESS } from '@/constant'
import {
  getInjectedProvider,
  randomSaltNonce,
  getSafeHomeUrl,
  getSafeSettingsUrl,
  openSafeAppUrl,
  formatSafeTransactionValue,
  getSafeTransactionMethod,
  formatSafeTransferAmount,
  formatSafeTransferType,
  transformToSafeMultisigResponse
} from '../safe'
import type { SafeTransaction } from '@/types/safe'
import type { SafeIncomingTransfer } from '@/types'

describe('safe utils', () => {
  const originalWindow = globalThis.window

  afterEach(() => {
    Object.defineProperty(globalThis, 'window', {
      value: originalWindow,
      writable: true,
      configurable: true
    })
  })

  describe('getInjectedProvider', () => {
    it('returns provider when EIP-1193 request exists', () => {
      const provider = { request: vi.fn() }
      Object.defineProperty(globalThis, 'window', {
        value: { ethereum: provider },
        writable: true,
        configurable: true
      })
      expect(getInjectedProvider()).toBe(provider)
    })

    it('throws for missing provider or invalid shape', () => {
      Object.defineProperty(globalThis, 'window', {
        value: {},
        writable: true,
        configurable: true
      })
      expect(() => getInjectedProvider()).toThrow('No injected Ethereum provider found')

      Object.defineProperty(globalThis, 'window', {
        value: { ethereum: { invalid: true } },
        writable: true,
        configurable: true
      })
      expect(() => getInjectedProvider()).toThrow(
        'Injected provider does not implement EIP-1193 request method'
      )
    })
  })

  it('randomSaltNonce returns distinct 32-byte hex values', () => {
    const a = randomSaltNonce()
    const b = randomSaltNonce()
    expect(a).toMatch(/^0x[0-9a-f]{64}$/)
    expect(a).not.toBe(b)
  })

  it('builds safe app URLs with chain fallback', () => {
    expect(getSafeHomeUrl(137, '0xABCDEF1234567890ABCDEF1234567890ABCDEF12')).toContain('polygon:')
    expect(getSafeHomeUrl(999999, '0xABCDEF1234567890ABCDEF1234567890ABCDEF12')).toContain(
      'ethereum:'
    )
    expect(getSafeSettingsUrl(11155111, '0xSafeAddr')).toContain('sepolia:0xSafeAddr')
    expect(getSafeSettingsUrl(999999, '0xSafeAddr')).toContain('ethereum:0xSafeAddr')
  })

  it('opens Safe URL in new tab', () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)
    openSafeAppUrl('https://app.safe.global/home?safe=polygon:0xABC')
    expect(openSpy).toHaveBeenCalledWith(
      'https://app.safe.global/home?safe=polygon:0xABC',
      '_blank',
      'noopener,noreferrer'
    )
    openSpy.mockRestore()
  })

  describe('formatSafeTransactionValue', () => {
    it('formats native value and placeholder branches', () => {
      expect(formatSafeTransactionValue(String(1_000_000_000_000_000_000n))).toBe(
        `1.0000 ${NETWORK.currencySymbol}`
      )
      expect(
        formatSafeTransactionValue('0', {
          method: 'pause',
          parameters: []
        } as never)
      ).toBe('...')
      expect(formatSafeTransactionValue('0')).toBe(`0.0000 ${NETWORK.currencySymbol}`)
    })

    it('formats known ERC20 transfer via token address', () => {
      const result = formatSafeTransactionValue(
        '0',
        {
          method: 'transfer',
          parameters: [
            { name: 'to', type: 'address', value: '0xRecipient' },
            { name: 'amount', type: 'uint256', value: '1000000' }
          ]
        } as never,
        USDC_ADDRESS
      )
      expect(result).toBe('1.0000 USDC')
    })

    it('falls back to native symbol when token is unknown or invalid value', () => {
      const unknown = formatSafeTransactionValue(
        '0',
        {
          method: 'transfer',
          parameters: [
            { name: 'to', type: 'address', value: '0xRecipient' },
            { name: 'amount', type: 'uint256', value: '1000000' }
          ]
        } as never,
        '0xUnknownToken'
      )
      expect(unknown).toContain(NETWORK.currencySymbol)

      expect(formatSafeTransactionValue('not-a-number')).toBe(`0 ${NETWORK.currencySymbol}`)
    })
  })

  describe('getSafeTransactionMethod', () => {
    it('returns decoded method when valid', () => {
      expect(
        getSafeTransactionMethod({ value: '0', dataDecoded: { method: 'transfer' } as never })
      ).toBe('transfer')
    })

    it('derives transfer/unknown when decoded method is absent', () => {
      expect(getSafeTransactionMethod({ value: '1', dataDecoded: undefined })).toBe('transfer')
      expect(getSafeTransactionMethod({ value: '0', dataDecoded: undefined })).toBe('unknown')
      expect(getSafeTransactionMethod({ value: 'bad', dataDecoded: undefined })).toBe('unknown')
    })
  })

  it('formats transfer amount and transfer type labels', () => {
    expect(
      formatSafeTransferAmount({ type: 'ERC721_TRANSFER', value: '1' } as SafeIncomingTransfer)
    ).toBe('NFT')

    expect(
      formatSafeTransferAmount({
        type: 'ERC20_TRANSFER',
        value: '1000000',
        tokenInfo: { decimals: 6, symbol: 'USDC' }
      } as SafeIncomingTransfer)
    ).toBe('1.0000 USDC')

    expect(
      formatSafeTransferAmount({
        type: 'ETHER_TRANSFER',
        value: String(1_000_000_000_000_000_000n)
      } as SafeIncomingTransfer)
    ).toBe(`1.000000 ${NETWORK.currencySymbol}`)

    expect(formatSafeTransferType('ETHER_TRANSFER')).toBe(NETWORK.currencySymbol)
    expect(formatSafeTransferType('ERC20_TRANSFER')).toBe('ERC20')
    expect(formatSafeTransferType('ERC721_TRANSFER')).toBe('NFT')
    expect(formatSafeTransferType('CUSTOM_TYPE')).toBe('CUSTOM_TYPE')
  })

  describe('transformToSafeMultisigResponse', () => {
    const baseTx: SafeTransaction = {
      safe: '0xSafe',
      to: '0xTo',
      value: '1000',
      data: '0xdata',
      operation: 0,
      gasToken: zeroAddress,
      safeTxGas: 21000,
      baseGas: 0,
      gasPrice: 0,
      refundReceiver: null,
      nonce: 1,
      executionDate: null,
      submissionDate: '2024-01-01T00:00:00Z',
      modified: '2024-01-01T00:00:00Z',
      blockNumber: null,
      transactionHash: null,
      safeTxHash: '0xhash',
      proposer: null,
      proposedByDelegate: false,
      executor: null,
      isExecuted: false,
      isSuccessful: null,
      ethGasPrice: null,
      maxFeePerGas: null,
      maxPriorityFeePerGas: null,
      gasUsed: null,
      fee: null,
      origin: '',
      dataDecoded: undefined,
      confirmationsRequired: 2,
      confirmations: [],
      trusted: true,
      signatures: null
    }

    it('maps scalar fields and normalises nullables', () => {
      const result = transformToSafeMultisigResponse(baseTx)
      expect(result.safe).toBe('0xSafe')
      expect(result.nonce).toBe('1')
      expect(result.safeTxGas).toBe('21000')
      expect(result.baseGas).toBe('0')
      expect(result.gasPrice).toBe('0')
      expect(result.data).toBe('0xdata')
      expect(result.confirmations).toHaveLength(0)
    })

    it('handles proposedByDelegate variants and confirmation mapping', () => {
      const delegateFromProposer = transformToSafeMultisigResponse({
        ...baseTx,
        proposedByDelegate: true,
        proposer: '0xProposer'
      })
      expect(delegateFromProposer.proposedByDelegate).toBe('0xProposer')

      const delegateFromExecutor = transformToSafeMultisigResponse({
        ...baseTx,
        proposedByDelegate: true,
        proposer: null,
        executor: '0xExecutor'
      } as never)
      expect(delegateFromExecutor.proposedByDelegate).toBe('0xExecutor')

      const withConfirmation = transformToSafeMultisigResponse({
        ...baseTx,
        confirmations: [
          {
            owner: '0xOwner',
            submissionDate: '2024-01-02T00:00:00Z',
            transactionHash: null,
            signature: '0xsig',
            signatureType: 'EOA'
          }
        ]
      } as never)
      expect(withConfirmation.confirmations?.[0]?.owner).toBe('0xOwner')
      expect(withConfirmation.confirmations?.[0]?.signature).toBe('0xsig')
    })

    it('applies defaults for null/empty values', () => {
      const result = transformToSafeMultisigResponse({
        ...baseTx,
        data: null as never,
        safeTxGas: null as never,
        baseGas: null as never,
        gasPrice: null as never,
        origin: null as never,
        trusted: null as never
      })

      expect(result.data).toBeUndefined()
      expect(result.safeTxGas).toBe('0')
      expect(result.baseGas).toBe('0')
      expect(result.gasPrice).toBe('0')
      expect(result.origin).toBe('')
      expect(result.trusted).toBe(true)
    })
  })
})
