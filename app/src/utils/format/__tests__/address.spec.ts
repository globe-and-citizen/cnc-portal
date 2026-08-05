import { describe, it, expect } from 'vitest'
import { formatAddress, formatTxHash } from '@/utils/format/address'

const ADDRESS = '0x4b6f7A1d2C3e4F5a6B7c8D9e0F1a2B3c4D5e6F70'

describe('formatAddress', () => {
  it('keeps the leading 0x prefix and the trailing characters', () => {
    expect(formatAddress(ADDRESS)).toBe('0x4b6f...6F70')
  })

  it('uses a single ellipsis form across the app', () => {
    expect(formatAddress(ADDRESS)).toContain('...')
    expect(formatAddress(ADDRESS)).not.toContain('…')
  })

  it('leaves values short enough to read whole untouched', () => {
    expect(formatAddress('0x123456')).toBe('0x123456')
    expect(formatAddress('0x12345678')).toBe('0x12345678')
  })

  it('honours a custom truncation window', () => {
    expect(formatAddress(ADDRESS, { lead: 10, tail: 6 })).toBe('0x4b6f7A1d...5e6F70')
  })

  it('returns an empty string for a missing value', () => {
    expect(formatAddress(undefined)).toBe('')
    expect(formatAddress(null)).toBe('')
    expect(formatAddress('')).toBe('')
  })
})

describe('formatTxHash', () => {
  it('truncates the same way as an address', () => {
    const hash = `${ADDRESS}0000000000000000000000ab`
    expect(formatTxHash(hash)).toBe('0x4b6f...00ab')
  })
})
