import { describe, it, expect } from 'vitest'
import { getAbi, resolveFolder, type FolderVersion } from '@/artifacts/registry'
import registry from '@/artifacts/version-registry.json'

const CURRENT = registry.current as FolderVersion

describe('artifacts/registry', () => {
  describe('resolveFolder', () => {
    it('maps a known Officer-generation tag to its folder', () => {
      // `legacy` and `v0.10` both belong to the v1 folder per the registry.
      expect(resolveFolder('legacy')).toBe('v1')
      expect(resolveFolder('v0.10')).toBe('v1')
    })

    it('defaults to the oldest folder when the tag is missing', () => {
      expect(resolveFolder(undefined)).toBe('v1')
      expect(resolveFolder(null)).toBe('v1')
    })

    it('defaults to the oldest folder for an unknown tag (backward-compat safe)', () => {
      expect(resolveFolder('does-not-exist')).toBe('v1')
    })
  })

  describe('getAbi', () => {
    it('returns a non-empty ABI array for a per-team contract type', () => {
      const abi = getAbi('Bank', 'v1')
      expect(Array.isArray(abi)).toBe(true)
      expect(abi.length).toBeGreaterThan(0)
    })

    it('resolves the current folder to the live top-level ABIs', () => {
      expect(getAbi('Bank', CURRENT)).toEqual(getAbi('Bank', 'v1'))
    })

    it('resolves every mapped per-team contract type without throwing', () => {
      const types = [
        'Bank',
        'BoardOfDirectors',
        'CashRemunerationEIP712',
        'Elections',
        'ExpenseAccountEIP712',
        'FixedReturn',
        'InvestorV1',
        'Proposals',
        'SafeDepositRouter',
        'Vesting',
        'Voting'
      ] as const
      for (const type of types) {
        expect(getAbi(type, 'v1').length).toBeGreaterThan(0)
      }
    })

    it('throws for a contract type with no registered ABI', () => {
      // `Safe` is an external Gnosis Safe — no wrapper is bundled for it.
      expect(() => getAbi('Safe', 'v1')).toThrow(/no abi registered/i)
    })
  })

  it('exposes beacon/impl Ignition module keys for the current folder', () => {
    // Sanity: the current folder exists and carries the module-key maps the
    // backend/app address resolvers depend on. Values are Ignition module keys
    // (`Module#Contract`), not addresses.
    const folder = registry.folders[CURRENT as keyof typeof registry.folders]
    expect(folder).toBeDefined()
    expect(folder.beacons.Bank).toContain('#')
    // The impl map carries FeeCollector even though it has no beacon.
    expect(folder.implementations.FeeCollector).toContain('#')
  })
})
