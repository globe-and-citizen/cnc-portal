import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import { AddCampaignService } from '@/services/AddCampaignService'

import {
  getWalletClient,
  getPublicClient,
  writeContract,
  waitForTransactionReceipt
} from '@wagmi/core'
//import { parseUnits, formatUnits } from 'viem/utils'
import { getLogs } from 'viem/actions'
//import { parseAbiItem } from 'viem'

vi.mock('@/queries/contract.queries', () => ({
  useCreateContract: vi.fn()
}))

vi.mock('@wagmi/core', async () => {
  const actual = await vi.importActual('@wagmi/core')
  return {
    ...actual,
    getWalletClient: vi.fn(),
    getPublicClient: vi.fn(),
    writeContract: vi.fn(),
    readContract: vi.fn(),
    waitForTransactionReceipt: vi.fn()
  }
})

vi.mock('viem/actions', () => ({
  getLogs: vi.fn()
}))

describe('AddCampaignService (wagmi)', () => {
  let service: AddCampaignService
  const contractAddress = '0xCampaignContract'
  const deployer = '0xDeployer'
  const admin = '0xAdmin'
  const teamId = 'team-123'
  const hash = '0xTxHash'
  const fakeReceipt = { contractAddress: '0xDeployed' }

  beforeEach(() => {
    service = new AddCampaignService()
    vi.resetAllMocks()
  })

  it.skip('createAdCampaignManager - deploys contract and calls API', async () => {
    const post = vi.fn().mockReturnValue({ json: vi.fn() })
    ;(useCustomFetch as unknown as Mock).mockReturnValue({ post })
    ;(getWalletClient as Mock).mockResolvedValue({
      deployContract: vi.fn().mockResolvedValue(hash),
      account: { address: deployer }
    })
    ;(waitForTransactionReceipt as Mock).mockResolvedValue(fakeReceipt)

    const result = await service.createAdCampaignManager('0xBank', '0.01', '0.02', deployer, teamId)

    expect(result).toBe(fakeReceipt.contractAddress)
    expect(post).toHaveBeenCalledWith({
      teamContract: {
        address: fakeReceipt.contractAddress,
        type: 'Campaign',
        deployer,
        admins: [deployer]
      }
    })
  })

  it('addAdmin - sends tx and waits for receipt', async () => {
    ;(writeContract as Mock).mockResolvedValue(hash)
    ;(waitForTransactionReceipt as Mock).mockResolvedValue({ status: 'success' })

    const result = await service.addAdmin(contractAddress, admin)

    expect(writeContract).toHaveBeenCalled()
    expect(result).toEqual({ status: 'success' })
  })

  it('removeAdmin - sends tx and waits for receipt', async () => {
    ;(writeContract as Mock).mockResolvedValue(hash)
    ;(waitForTransactionReceipt as Mock).mockResolvedValue({ status: 'success' })

    const result = await service.removeAdmin(contractAddress, admin)

    expect(writeContract).toHaveBeenCalled()
    expect(result).toEqual({ status: 'success' })
  })

  it('getAdminList - filters and deduplicates added/removed admins', async () => {
    const client = {
      getBlockNumber: vi.fn().mockResolvedValue(10000n)
    }
    ;(getPublicClient as Mock).mockReturnValue(client)

    const adminLogs = [{ args: { admin: '0xAdmin1' } }, { args: { admin: '0xAdmin2' } }]
    const removedLogs = [{ args: { admin: '0xAdmin1' } }]

    ;(getLogs as Mock).mockImplementation((_client, { event }) => {
      if (event.name === 'AdminAdded') return adminLogs
      if (event.name === 'AdminRemoved') return removedLogs
      return []
    })

    const list = await service.getAdminList(contractAddress)
    expect(list).toEqual(['0xAdmin2'])
  })

  it('getEventsGroupedByCampaignCode - parses all event types', async () => {
    const mockLogs = [
      { args: { campaignCode: '0xABC', budget: 1000n } },
      { args: { campaignCode: '0xABC', paymentAmount: 200n } },
      { args: { campaignCode: '0xABC', advertiser: '0xAdv', amount: 300n } },
      { args: { campaignCode: '0xABC', paymentAmount: 150n } }
    ]
    ;(getPublicClient as Mock).mockReturnValue({
      getBlockNumber: vi.fn().mockResolvedValue(10000n)
    })
    ;(getLogs as Mock).mockResolvedValue(mockLogs)

    const result = await service.getEventsGroupedByCampaignCode(contractAddress)
    expect(result.status).toBe('success')
    expect(result.events?.['0xABC'].length).toBe(16)
  })
})
