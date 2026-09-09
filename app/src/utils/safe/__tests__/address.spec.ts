import { describe, expect, it } from 'vitest'
import { normalizeSafeAddress } from '@/utils/safe/address'

const LOWERCASE_SAFE_ADDRESS = '0x0557f280d9da274254e85ee70c2936694e494275'
const CHECKSUM_SAFE_ADDRESS = '0x0557F280D9DA274254e85Ee70c2936694e494275'

describe('normalizeSafeAddress', () => {
  it('converts a lowercase Safe address to EIP-55 checksum form', () => {
    expect(normalizeSafeAddress(LOWERCASE_SAFE_ADDRESS)).toBe(CHECKSUM_SAFE_ADDRESS)
  })

  it('trims surrounding whitespace before normalization', () => {
    expect(normalizeSafeAddress(`  ${LOWERCASE_SAFE_ADDRESS}  `)).toBe(CHECKSUM_SAFE_ADDRESS)
  })

  it('rejects an invalid Safe address', () => {
    expect(() => normalizeSafeAddress('not-a-safe')).toThrow('Invalid Safe address')
  })
})
