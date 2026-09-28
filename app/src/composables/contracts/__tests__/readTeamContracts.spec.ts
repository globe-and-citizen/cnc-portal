import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readContract } from '@wagmi/core'
import type { TeamContract } from '@/types'
import { getTeamContracts } from '../readTeamContracts'

const CONTRACTS = [
  {
    address: '0x0000000000000000000000000000000000000001',
    type: 'Bank',
    deployer: '0x0000000000000000000000000000000000000011',
    admins: []
  },
  {
    address: '0x0000000000000000000000000000000000000002',
    type: 'Proposals',
    deployer: '0x0000000000000000000000000000000000000011',
    admins: []
  },
  {
    address: '0x0000000000000000000000000000000000000003',
    type: 'UnknownContract',
    deployer: '0x0000000000000000000000000000000000000011',
    admins: []
  }
] as unknown as TeamContract[]

const mockReadContract = vi.mocked(readContract)

describe('getTeamContracts pause capability reads', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockReadContract.mockImplementation(async (_config, parameters) => {
      if (parameters.functionName === 'owner') {
        return '0x0000000000000000000000000000000000000021'
      }
      if (parameters.functionName === 'paused') return false
      throw new Error('Unexpected contract read')
    })
  })

  it('[AC-US-CONTRACT-001-05] distinguishes active, unsupported, and unknown contracts', async () => {
    const result = await getTeamContracts(CONTRACTS, '2.0.1')

    expect(result?.map(({ pauseStatus }) => pauseStatus)).toEqual([
      'active',
      'not-supported',
      'unavailable'
    ])
    expect(
      mockReadContract.mock.calls.filter(([, parameters]) => parameters.functionName === 'paused')
    ).toHaveLength(1)
  })

  it('[AC-US-CONTRACT-001-05] preserves a verified paused state', async () => {
    mockReadContract.mockImplementation(async (_config, parameters) => {
      if (parameters.functionName === 'owner') {
        return '0x0000000000000000000000000000000000000021'
      }
      if (parameters.functionName === 'paused') return true
      throw new Error('Unexpected contract read')
    })

    const result = await getTeamContracts([CONTRACTS[0]!], '2.0.1')

    expect(result?.[0]?.pauseStatus).toBe('paused')
  })

  it('[AC-US-CONTRACT-001-10] fails closed when a supported pause read fails', async () => {
    mockReadContract.mockImplementation(async (_config, parameters) => {
      if (parameters.functionName === 'owner') {
        return '0x0000000000000000000000000000000000000021'
      }
      throw new Error('RPC unavailable')
    })

    const result = await getTeamContracts([CONTRACTS[0]!], '2.0.1')

    expect(result?.[0]?.pauseStatus).toBe('unavailable')
  })

  it('[AC-US-CONTRACT-001-10] does not probe pause state for an unresolved generation', async () => {
    const result = await getTeamContracts([CONTRACTS[0]!], 'unknown')

    expect(result?.[0]?.pauseStatus).toBe('unavailable')
    expect(
      mockReadContract.mock.calls.filter(([, parameters]) => parameters.functionName === 'paused')
    ).toHaveLength(0)
  })
})
