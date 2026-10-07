import { describe, expect, it } from 'vitest'
import { assetLogoUri, assetMetadata } from '../assets'

const address = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
const info = {
  address,
  name: 'DAI',
  symbol: 'DAI',
  decimals: 18,
  logoUri: 'https://assets.example/dai.png'
}

describe('contract token logo metadata', () => {
  it('retains the logo only when the metadata matches the token contract', () => {
    expect(assetMetadata(address, 137, info).logoUri).toBe(info.logoUri)
    expect(
      assetMetadata(address, 137, {
        ...info,
        address: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
      }).logoUri
    ).toBeUndefined()
  })
  it.each([
    'javascript:alert(1)',
    'data:image/svg+xml;base64,abc',
    'http://assets.example/dai.png',
    'https://user:password@assets.example/dai.png',
    'invalid',
    null
  ])('omits unusable logo URI %s', (value) => {
    expect(assetLogoUri(value)).toBeUndefined()
  })
})
