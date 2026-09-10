import { beforeEach, describe, expect, it, vi } from 'vitest'
import { zeroAddress, type Address } from 'viem'
import externalApiClient from '@/lib/external.axios'
import { proposeSafeTransaction } from '@/lib/safe/transactions'
import type { SafeSdkInstance } from '@/types/safe.mutation'

const LOWERCASE_SAFE_ADDRESS = '0x0557f280d9da274254e85ee70c2936694e494275'
const CHECKSUM_SAFE_ADDRESS = '0x0557F280D9DA274254e85Ee70c2936694e494275'

describe('proposeSafeTransaction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('posts proposals under the checksum-normalized Safe address', async () => {
    const safeTransaction = {
      data: {
        to: zeroAddress,
        value: '0',
        data: '0x',
        operation: 0
      }
    }
    const safeSdk = {
      createTransaction: vi.fn().mockResolvedValue(safeTransaction),
      getTransactionHash: vi.fn().mockResolvedValue('0xsafe-tx-hash'),
      signHash: vi.fn().mockResolvedValue({ data: '0xsignature' }),
      getNonce: vi.fn().mockResolvedValue(4)
    } as unknown as SafeSdkInstance
    const post = vi.spyOn(externalApiClient, 'post').mockResolvedValue({ data: undefined })

    await proposeSafeTransaction({
      safeSdk,
      transactionData: [{ to: zeroAddress, value: '0', data: '0x', operation: 0 }],
      chainId: 137,
      safeAddress: LOWERCASE_SAFE_ADDRESS,
      signer: '0x1111111111111111111111111111111111111111' as Address
    })

    expect(post).toHaveBeenCalledWith(
      expect.stringContaining(`/safes/${CHECKSUM_SAFE_ADDRESS}/multisig-transactions/`),
      expect.objectContaining({ contractTransactionHash: '0xsafe-tx-hash' })
    )
  })
})
