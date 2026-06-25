import { describe, it, expect } from 'vitest'
import { getAddress } from 'viem'
import type { TeamContract } from '@/types/teamContract'
import {
  INTERNAL_POCKET_CONTRACT_TYPES,
  collectInternalAddresses,
  isInternalAddress
} from '../internalAddresses'

const BANK = '0x1111111111111111111111111111111111111111'
const INVESTOR = '0x2222222222222222222222222222222222222222'
const SAFE = '0x3333333333333333333333333333333333333333'
const VOTING = '0x4444444444444444444444444444444444444444'
const FEE_COLLECTOR = '0x5FbDB2315678afecb367f032d93F642f64180aa3'
const EXTERNAL = '0x9999999999999999999999999999999999999999'

const contract = (type: TeamContract['type'], address: string): TeamContract => ({
  address: address as TeamContract['address'],
  type,
  deployer: BANK as TeamContract['deployer'],
  admins: []
})

describe('INTERNAL_POCKET_CONTRACT_TYPES', () => {
  it('lists the six money-pocket TeamContract types (FeeCollector excluded)', () => {
    expect([...INTERNAL_POCKET_CONTRACT_TYPES]).toEqual([
      'Safe',
      'Bank',
      'CashRemunerationEIP712',
      'ExpenseAccountEIP712',
      'InvestorV1',
      'SafeDepositRouter'
    ])
  })
})

describe('collectInternalAddresses', () => {
  it('keeps only the money-pocket contracts and drops governance/wiring ones', () => {
    const set = collectInternalAddresses([
      contract('Bank', BANK),
      contract('InvestorV1', INVESTOR),
      contract('Safe', SAFE),
      contract('Voting', VOTING),
      contract('BoardOfDirectors', EXTERNAL)
    ])
    expect(set).toEqual(new Set([getAddress(BANK), getAddress(INVESTOR), getAddress(SAFE)]))
  })

  it('folds in extra protocol-wide addresses (e.g. the global FeeCollector)', () => {
    const set = collectInternalAddresses([contract('Bank', BANK)], [FEE_COLLECTOR])
    expect(set.has(getAddress(FEE_COLLECTOR))).toBe(true)
    expect(set.has(getAddress(BANK))).toBe(true)
  })

  it('ignores nullish / invalid extra entries', () => {
    const set = collectInternalAddresses(
      [contract('Bank', BANK)],
      [null, undefined, '0xnotanaddress']
    )
    expect(set).toEqual(new Set([getAddress(BANK)]))
  })

  it('checksum-normalizes addresses', () => {
    const set = collectInternalAddresses([contract('Bank', FEE_COLLECTOR.toLowerCase())])
    expect(set.has(getAddress(FEE_COLLECTOR))).toBe(true)
  })

  it('returns an empty set for undefined / empty contracts', () => {
    expect(collectInternalAddresses(undefined)).toEqual(new Set())
    expect(collectInternalAddresses([])).toEqual(new Set())
  })
})

describe('isInternalAddress', () => {
  const set = collectInternalAddresses([contract('Bank', BANK)], [FEE_COLLECTOR])

  it('matches member addresses in checksummed or lowercase form', () => {
    expect(isInternalAddress(BANK, set)).toBe(true)
    expect(isInternalAddress(FEE_COLLECTOR, set)).toBe(true)
    expect(isInternalAddress(FEE_COLLECTOR.toLowerCase(), set)).toBe(true)
  })

  it('treats external addresses as not internal', () => {
    expect(isInternalAddress(EXTERNAL, set)).toBe(false)
  })

  it('treats missing / malformed addresses as not internal without throwing', () => {
    expect(isInternalAddress(undefined, set)).toBe(false)
    expect(isInternalAddress(null, set)).toBe(false)
    expect(isInternalAddress('', set)).toBe(false)
    expect(isInternalAddress('0xnope', set)).toBe(false)
  })
})
