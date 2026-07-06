import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { encodeFunctionData, zeroAddress, type Address } from 'viem'
import {
  validateBeaconAddresses,
  getBeaconConfigs,
  getDeploymentConfigs
} from '../contractDeploymentUtil'
import { FIXED_RETURN_ABI } from '@/artifacts/abi/fixed-return'
import { INVESTOR_ABI } from '@/artifacts/abi/investors'
import { FIXED_RETURN_BEACON_ADDRESS, USDC_ADDRESS, USDC_E_ADDRESS, USDT_ADDRESS } from '@/constant'

const CURRENT_USER = '0x000000000000000000000000000000000000A1' as Address

describe('validateBeaconAddresses', () => {
  it('does not throw when every beacon address is configured', () => {
    expect(() => validateBeaconAddresses()).not.toThrow()
  })
})

describe('getBeaconConfigs', () => {
  it('includes a FixedReturn entry pointing at FIXED_RETURN_BEACON_ADDRESS', () => {
    const configs = getBeaconConfigs()
    const fixedReturn = configs.find((c) => c.beaconType === 'FixedReturn')

    expect(fixedReturn?.beaconAddress).toBe(FIXED_RETURN_BEACON_ADDRESS)
  })

  it('returns one entry per known beacon type', () => {
    const configs = getBeaconConfigs()
    expect(configs.map((c) => c.beaconType)).toEqual([
      'Bank',
      'BoardOfDirectors',
      'Proposals',
      'ExpenseAccountEIP712',
      'CashRemunerationEIP712',
      'InvestorV1',
      'Elections',
      'SafeDepositRouter',
      'Vesting',
      'FixedReturn'
    ])
  })
})

describe('getDeploymentConfigs', () => {
  // encodeFunctionData is globally mocked to a fixed stub (tests/setup/viem.setup.ts),
  // so the encoded bytes themselves can't be decoded — assert on what it was called
  // with instead, which is the part this util is actually responsible for.
  beforeEach(() => {
    vi.mocked(encodeFunctionData).mockClear()
  })

  it('returns one config per known contract type, including FixedReturn', () => {
    const configs = getDeploymentConfigs(CURRENT_USER, { name: 'Acme', symbol: 'ACM' })
    expect(configs.map((c) => c.contractType)).toEqual([
      'Bank',
      'InvestorV1',
      'Proposals',
      'ExpenseAccountEIP712',
      'CashRemunerationEIP712',
      'Elections',
      'SafeDepositRouter',
      'Vesting',
      'FixedReturn'
    ])
  })

  it('encodes the FixedReturn initializer with the supported tokens and current user as owner', () => {
    getDeploymentConfigs(CURRENT_USER, { name: 'Acme', symbol: 'ACM' })

    expect(encodeFunctionData).toHaveBeenCalledWith({
      abi: FIXED_RETURN_ABI,
      functionName: 'initialize',
      args: [[USDT_ADDRESS, USDC_ADDRESS, USDC_E_ADDRESS], CURRENT_USER]
    })
  })

  it('encodes the InvestorV1 initializer with a zero default rewards token', () => {
    getDeploymentConfigs(CURRENT_USER, { name: 'Acme', symbol: 'ACM' })

    expect(encodeFunctionData).toHaveBeenCalledWith({
      abi: INVESTOR_ABI,
      functionName: 'initialize',
      args: ['Acme', 'ACM', zeroAddress]
    })
  })
})

describe('when the FixedReturn beacon is not deployed on the current network', () => {
  // FixedReturn is only live on hardhat today (Polygon prod hasn't deployed
  // it yet). Simulate that by nulling the resolved address and re-importing
  // the module fresh, since the beacon configs/deployment configs are built
  // from module-level constants.
  beforeEach(() => {
    vi.resetModules()
    vi.doMock('@/constant', async (importOriginal) => ({
      ...(await importOriginal<typeof import('@/constant')>()),
      FIXED_RETURN_BEACON_ADDRESS: null
    }))
  })

  afterEach(() => {
    vi.doUnmock('@/constant')
    vi.resetModules()
  })

  it('does not throw even though FixedReturn has no beacon address', async () => {
    const { validateBeaconAddresses: validateWithoutFixedReturn } =
      await import('../contractDeploymentUtil')

    expect(() => validateWithoutFixedReturn()).not.toThrow()
  })

  it('omits FixedReturn from the beacon configs', async () => {
    const { getBeaconConfigs: getBeaconConfigsWithoutFixedReturn } =
      await import('../contractDeploymentUtil')

    const configs = getBeaconConfigsWithoutFixedReturn()
    expect(configs.map((c) => c.beaconType)).not.toContain('FixedReturn')
  })

  it('omits FixedReturn from the deployment configs', async () => {
    const { getDeploymentConfigs: getDeploymentConfigsWithoutFixedReturn } =
      await import('../contractDeploymentUtil')

    const configs = getDeploymentConfigsWithoutFixedReturn(CURRENT_USER, {
      name: 'Acme',
      symbol: 'ACM'
    })
    expect(configs.map((c) => c.contractType)).not.toContain('FixedReturn')
  })
})
