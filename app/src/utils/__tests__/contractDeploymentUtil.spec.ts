import { describe, it, expect, vi, beforeEach } from 'vitest'
import { encodeFunctionData, zeroAddress, type Address } from 'viem'
import {
  validateBeaconAddresses,
  getBeaconConfigs,
  getDeploymentConfigs,
  handleBeaconProxyCreatedLogs
} from '../contractDeploymentUtil'
import { FIXED_RETURN_ABI } from '@/artifacts/abi/fixed-return'
import { INVESTOR_ABI } from '@/artifacts/abi/investors'
import { FIXED_RETURN_BEACON_ADDRESS, USDC_ADDRESS, USDC_E_ADDRESS, USDT_ADDRESS } from '@/constant'
import { mockLog } from '@/tests/mocks/utils.mock'

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

describe('handleBeaconProxyCreatedLogs', () => {
  const PROXY_ADDRESS = '0x000000000000000000000000000000000000B2' as Address
  const TX_HASH = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as const

  function buildLog(overrides: Partial<{ deployer: Address; proxy: Address; hash: string }> = {}) {
    return {
      args: {
        deployer: overrides.deployer ?? CURRENT_USER,
        proxy: overrides.proxy ?? PROXY_ADDRESS
      },
      transactionHash: overrides.hash ?? TX_HASH
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns the proxy address when the hash and deployer both match', () => {
    const result = handleBeaconProxyCreatedLogs([buildLog()], TX_HASH, CURRENT_USER)
    expect(result).toBe(PROXY_ADDRESS)
  })

  it('returns null and logs an error when there are no logs', () => {
    const result = handleBeaconProxyCreatedLogs([], TX_HASH, CURRENT_USER)
    expect(result).toBeNull()
    expect(mockLog.error).toHaveBeenCalledWith('No logs found')
  })

  it('returns null when the transaction hash does not match', () => {
    const result = handleBeaconProxyCreatedLogs([buildLog()], '0xdeadbeef', CURRENT_USER)
    expect(result).toBeNull()
    expect(mockLog.error).toHaveBeenCalledWith('Transaction hash does not match')
  })

  it('returns null when the deployer does not match the current user', () => {
    const otherDeployer = '0x000000000000000000000000000000000000C3' as Address
    const result = handleBeaconProxyCreatedLogs(
      [buildLog({ deployer: otherDeployer })],
      TX_HASH,
      CURRENT_USER
    )
    expect(result).toBeNull()
    expect(mockLog.error).toHaveBeenCalledWith(
      'Deployer address does not match with the current user address'
    )
  })
})
