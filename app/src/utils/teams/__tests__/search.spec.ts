import { describe, expect, it } from 'vitest'
import { filterDirectoryItems } from '../search'

const items = [
  { name: 'Alpha', address: '0xabc', type: 'Team' },
  { name: 'Beta', address: '0xdef', type: 'Contract' },
  { name: 'Gamma', address: '0x999' }
]

describe('filterDirectoryItems', () => {
  it('matches by name and address', () => {
    expect(filterDirectoryItems(items, { name: 'alp', address: '0x' })).toEqual([
      { name: 'Alpha', address: '0xabc', type: 'Team' }
    ])
  })

  it('matches by type and address when name does not match', () => {
    expect(filterDirectoryItems(items, { name: 'contract', address: '0x' })).toEqual([
      { name: 'Beta', address: '0xdef', type: 'Contract' }
    ])
  })
})
